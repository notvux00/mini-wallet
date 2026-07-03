function getAmountField(transDef) {
  if (transDef && transDef.amountField) {
    return transDef.amountField;
  }
  if (transDef && transDef.glSteps && transDef.glSteps.length > 0) {
    return transDef.glSteps.slice().sort((a, b) => (a.order || 0) - (b.order || 0))[0].amount;
  }
  return 'AMOUNT';
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

module.exports = {
  getAmountField,

  calculate: function (service, amount) {
    const feeConfig = service.fee || {};
    const type = feeConfig.type || 'fixed';
    const value = Number(feeConfig.value) || 0;

    let fee = 0;
    if (type === 'percent') {
      fee = (Number(amount) || 0) * value / 100;
    } else {
      fee = value;
    }

    if (feeConfig.min !== undefined && feeConfig.min !== null) {
      fee = Math.max(fee, Number(feeConfig.min) || 0);
    }
    if (feeConfig.max !== undefined && feeConfig.max !== null) {
      fee = Math.min(fee, Number(feeConfig.max) || 0);
    }

    return roundCurrency(fee);
  },

  applyToTransBody: function (service, transDef, TRANSBODY) {
    const amountField = getAmountField(transDef);
    const amount = Number(TRANSBODY[amountField]) || 0;
    const fee = this.calculate(service, amount);

    TRANSBODY.DEBITFEE = fee;
    TRANSBODY.FEE = fee;
    TRANSBODY.TOTALAMOUNT = roundCurrency(amount + fee);

    return {
      amountField,
      amount,
      fee,
      totalAmount: TRANSBODY.TOTALAMOUNT,
    };
  },
};
