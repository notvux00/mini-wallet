const cron = require('node-cron');

module.exports = {
  init: function() {
    sails.log.info('Khởi tạo CronService...');

    // Job 1: Dọn dẹp Ví bị kẹt & TransactionTrail bị treo (Mỗi 5 phút)
    cron.schedule('*/5 * * * *', async () => {
      try {

        const now = Date.now();
        const fiveMinsAgo = now - 5 * 60 * 1000;
        const fifteenMinsAgo = now - 15 * 60 * 1000;

        // 1. Mở khóa các ví bị kẹt (inProgress > 5 phút)
        const stuckPockets = await Pocket.find({
          state: 'inProgress',
          updatedAt: { '<': fiveMinsAgo }
        });

        if (stuckPockets.length > 0) {
          const pocketIds = stuckPockets.map(p => p.id);
          await Pocket.update({ id: { 'in': pocketIds } }).set({
            state: 'active',
            updatedAt: now
          });
          sails.log.info(`[Cron] Đã mở khóa ${stuckPockets.length} ví bị kẹt.`);
        }

        // 2. Chuyển các TransactionTrail bị pending/init quá lâu (> 15 phút) thành failed
        // Điều này giúp dọn dẹp các rác pending do user thoát app giữa chừng
        const staleTrails = await TransactionTrail.find({
          status: { 'in': ['init', 'pending'] },
          updatedAt: { '<': fifteenMinsAgo }
        });

        if (staleTrails.length > 0) {
          for (const trail of staleTrails) {
            const logs = trail.transStepLog || [];
            logs.push({
              step: trail.transStep,
              timestamp: now,
              result: 'failed',
              message: 'Giao dịch hết hạn (Timeout) hoặc hệ thống tự phục hồi',
              errorCode: 'SYSTEM_RECOVERED'
            });

            await TransactionTrail.updateOne({ id: trail.id }).set({
              status: 'failed',
              transStepLog: logs,
              outputMessage: { ...trail.outputMessage, error: 'Giao dịch hết hạn' },
              updatedAt: now
            });
          }
          sails.log.info(`[Cron] Đã đánh dấu failed cho ${staleTrails.length} giao dịch bị treo.`);
        }

      } catch (error) {
        sails.log.error('[Cron] Lỗi khi chạy CleanupCron:', error);
      }
    });

    // Job 2: Data Retention - Dọn dẹp Database ban đêm (Chạy lúc 02:00 sáng mỗi ngày)
    cron.schedule('0 2 * * *', async () => {
      try {
        sails.log.info('[Cron] Bắt đầu chạy RetentionCron (Xóa giao dịch lỗi quá hạn)...');
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        // Xóa các TransactionTrail thất bại và đã cũ hơn 30 ngày
        const deletedTrails = await TransactionTrail.destroy({
          status: 'failed',
          updatedAt: { '<': thirtyDaysAgo }
        }).fetch();

        if (deletedTrails && deletedTrails.length > 0) {
          sails.log.info(`[Cron] Đã xóa vĩnh viễn ${deletedTrails.length} bản ghi TransactionTrail rác (quá 30 ngày).`);
        } else {
          sails.log.info('[Cron] Không có dữ liệu rác cũ nào cần dọn hôm nay.');
        }

      } catch (error) {
        sails.log.error('[Cron] Lỗi khi chạy RetentionCron:', error);
      }
    });

    // Job 3: Biller Retry - Tự động gọi lại Đối tác khi rớt mạng (Chạy mỗi 1 phút)
    cron.schedule('* * * * *', async () => {
      try {
        const pendingTrails = await TransactionTrail.find({
          status: 'done',
          billerSyncStatus: 'pending'
        });

        if (pendingTrails.length > 0) {
          sails.log.info(`[Cron] Bắt đầu Retry Biller cho ${pendingTrails.length} giao dịch...`);
          const axios = require('axios');
          const _ = require('lodash');
          
          for (const trail of pendingTrails) {
            const biller = await Biller.findOne({ code: trail.billerCode });
            if (!biller || !biller.paymentUrl) {
               await TransactionTrail.updateOne({ id: trail.id }).set({ billerSyncStatus: 'failed' });
               continue;
            }

            try {
              const TRANSBODY = trail.inputMessage || {};
              const service = await Service.findOne({ id: trail.serviceId });
              const customerCodeField = service?.actionParams?.customerCodeField || 'BILLCODE';
              const customerCode = TRANSBODY[customerCodeField] || TRANSBODY.CUSTOMER_CODE || 'UNKNOWN';

              let reqBody = {};
              if (biller.payReqKeyCustomer) reqBody[biller.payReqKeyCustomer] = customerCode;
              if (biller.payReqKeyAmount) reqBody[biller.payReqKeyAmount] = TRANSBODY.TOTALAMOUNT || trail.totalAmount;
              if (biller.payReqKeyBillRef) reqBody[biller.payReqKeyBillRef] = trail.billerRefId || '';

              const response = await axios.post(biller.paymentUrl, reqBody, { timeout: 15000 });
              
              const statusPath = biller.payResMappingStatus || 'status';
              const successVal = biller.payResMappingSuccessValue || 'success';
              const resStatus = String(_.get(response.data, statusPath) || '');
              
              // Coi DUPLICATE cũng là success vì đối tác đã gạch nợ thành công trước đó
              if (resStatus.toLowerCase() === successVal.toLowerCase() || resStatus.toLowerCase() === 'duplicate') {
                await TransactionTrail.updateOne({ id: trail.id }).set({ billerSyncStatus: 'success', updatedAt: Date.now() });
                sails.log.info(`[Cron] Retry Biller thành công cho giao dịch ${trail.transRefId}`);
              } else {
                await TransactionTrail.updateOne({ id: trail.id }).set({ billerSyncStatus: 'failed', updatedAt: Date.now() });
                sails.log.error(`[Cron] Giao dịch ${trail.transRefId} bị Biller từ chối khi Retry.`);
              }
            } catch (err) {
              const newRetries = (trail.billerSyncRetries || 0) + 1;
              if (newRetries > 10) {
                 await TransactionTrail.updateOne({ id: trail.id }).set({ billerSyncStatus: 'failed', billerSyncRetries: newRetries, updatedAt: Date.now() });
                 sails.log.error(`[Cron] ALERT: Giao dịch ${trail.transRefId} (Biller ${trail.billerCode}) Retry thất bại 10 lần! Cần Kế toán hoàn tiền thủ công.`);
              } else {
                 await TransactionTrail.updateOne({ id: trail.id }).set({ billerSyncRetries: newRetries, updatedAt: Date.now() });
              }
            }
          }
        }
      } catch (error) {
        sails.log.error('[Cron] Lỗi khi chạy BillerRetryCron:', error);
      }
    });

    sails.log.info('Đã đăng ký các tiến trình chạy ngầm.');
  }
};
