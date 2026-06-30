module.exports = {
    dashboard: async function(req, res) {
        try {
            const customerId = req.user.id; // Lấy ID của khách hàng từ token đã xác thực

            // 1. Tìm thông tin của khách hàng
            const customer = await Customer.findOne({ id: customerId });

            if (!customer) {
                return res.error(respCode.NOT_FOUND, 'Không tìm thấy thông tin khách hàng!');
            }

            // Lấy số điện thoại của khách hàng
            const customerPhone = customer.phone;

            // 2. Tìm ví của khách hàng dựa
            const pocket = await Pocket.findOne({ user: customerId, client: 'customer' });
            if (!pocket) {
                return res.error(respCode.NOT_FOUND, 'Không tìm thấy ví của khách hàng!');
            }

            // 3. Kiểm tra bảo mật Checksum
            // Tính toán checksum từ số dư thực tế và ID khách hàng
            const currentChecksum = SecurityUtil.generatePocketChecksum(pocket.balance, customerId);

            // So sánh checksum với checksum lưu ở trong Database
            if (currentChecksum !== pocket.checksum) {
                sails.log.error(`[SECURITY ALERT] Checksum mismatch for pocket ${pocket.id}`);
                return res.error(respCode.BAD_REQUEST, 'Dữ liệu ví bị xâm phạm bảo mật!');
            }

            // 4. Thống kê thu/chi từ bảng Transaction
            // - Tiền đi: Khách là người gửi, tính cả tiền chuyển + phí (total Amount)
            const expenseTransactions = await Transaction.find({
                sender: customerPhone,
                status: 'done'
            });
            let totalExpense = 0;
            expenseTransactions.forEach(tx => {
                totalExpense += tx.totalAmount;
            });

            // - Tiền đến: Khách là người nhận, chỉ tính tiền nhận (total Amount)
            const incomeTransactions = await Transaction.find({
                receiver: customerPhone,
                status: 'done'
            });
            let totalIncome = 0;
            incomeTransactions.forEach(tx => {
                totalIncome += tx.amount;
            });

            // 5. Lấy top 5 lịch sử giao dịch gần nhất (cả gửi và nhận)
            const recentTransactions = await Transaction.find({
                where: {
                    or: [
                        { sender: customerPhone },
                        { receiver: customerPhone }
                    ],
                    status: 'done'
                },
                sort: 'createdAt DESC',
                limit: 5
            });

            const formattedTransactions = recentTransactions.map(tx => {
                // Kiểm tra xem khách hàng có phải là receiver hay không
                const isIncome = (tx.receiver === customerPhone);
                
                return {
                    id: tx.id,
                    transRefId: tx.transRefId,
                    createAt: tx.createdAt,
                    // Loại giao dịch
                    type: isIncome ? 'income' : 'expense',

                    // Thu thì lấy amount, chi thì lấy totalAmount vì bao gồm cả phí
                    displayAmount: isIncome ? tx.amount : tx.totalAmount,

                    // Trả luôn cả tiêu đề gợi ý để Frontend đỡ phải if-else
                    displayTitle: isIncome ? `Received from ${tx.sender}` : `Transfer to ${tx.receiver}`,

                    serviceId: tx.serviceId // Ví dụ: 'P2P TRANSFER'
                }
            })

        // 6. Trả kết quả
        return res.ok({
            balance: pocket.balance,
            income: totalIncome,
            expense: totalExpense,
            recentTransactions: formattedTransactions
        }, 'Tải Dashboard thành công!')




        } catch (error) {
            sails.log.error('Lỗi Dashboard:', error);
            return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận!');
        }
    }
};