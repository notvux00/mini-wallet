/**
 * OfficerDashboardController
 *
 * @description :: Server-side actions for handling dashboard statistics
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  getStats: async function (req, res) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. Tổng quát
      const totalCustomers = await Customer.count();
      const totalBillers = await Biller.count({ status: 'active' });

      // Transactions
      const allTrans = await Transaction.find();

      let totalVolume = 0;
      let totalFees = 0;
      let statusCount = { done: 0, failed: 0, pending: 0, processing: 0 };
      
      const last7DaysData = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        last7DaysData[dateStr] = { date: dateStr, volume: 0, count: 0 };
      }

      allTrans.forEach(t => {
        // Status count
        if (statusCount[t.status] !== undefined) {
          statusCount[t.status]++;
        } else {
          statusCount[t.status] = 1;
        }

        // Only count done for volume/fees
        if (t.status === 'done') {
          totalVolume += (t.amount || 0);
          totalFees += (t.fee || 0);
        }

        // 7 days chart
        if (t.createdAt >= sevenDaysAgo.getTime()) {
          const tDate = new Date(t.createdAt).toISOString().split('T')[0];
          if (last7DaysData[tDate]) {
            if (t.status === 'done') {
              last7DaysData[tDate].volume += (t.amount || 0);
            }
            last7DaysData[tDate].count++;
          }
        }
      });

      const chartData = Object.values(last7DaysData);

      // 5 giao dịch mới nhất
      const recentTrans = await Transaction.find({
        limit: 5,
        sort: 'createdAt DESC'
      });

      const serviceIds = recentTrans.map(t => t.serviceId).filter(Boolean);
      if (serviceIds.length > 0) {
        const services = await Service.find({ id: serviceIds });
        const serviceMap = {};
        services.forEach(s => serviceMap[s.id] = s);
        recentTrans.forEach(t => {
          t.service = serviceMap[t.serviceId];
        });
      }

      return res.ok({
        cards: {
          totalCustomers,
          totalBillers,
          totalVolume,
          totalFees,
          totalTransactions: allTrans.length
        },
        chartData,
        statusCount: [
          { name: 'Thành công', value: statusCount.done, fill: '#10b981' },
          { name: 'Thất bại', value: statusCount.failed, fill: '#ef4444' },
          { name: 'Đang chờ', value: statusCount.pending + statusCount.processing, fill: '#f59e0b' }
        ],
        recentTransactions: recentTrans
      }, 'Lấy thống kê thành công');

    } catch (error) {
      sails.log.error(error);
      return res.serverError({ msg: 'Có lỗi xảy ra khi lấy thống kê' });
    }
  }
};
