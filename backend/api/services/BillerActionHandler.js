function getNestedValue(payload, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((obj, key) => obj && obj[key], payload);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

async function postJson(url, body) {
  if (!url) {
    throw new Error('BILLER_ERR.URL_MISSING: Biller endpoint is missing.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (unusedError) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(`BILLER_ERR.HTTP_${response.status}: Biller endpoint returned an error.`);
  }

  return payload;
}

async function resolveBiller(service, TRANSBODY) {
  const params = service.actionParams || {};
  const billerValue = params.billerId
    || TRANSBODY[params.billerIdField || 'BILLERID']
    || TRANSBODY.BILLERID;

  if (!billerValue) {
    throw new Error('BILLER_ERR.MISSING_BILLER: Biller was not selected.');
  }

  let biller = await Biller.findOne({ id: billerValue, status: 'active' });
  if (!biller) {
    biller = await Biller.findOne({ code: billerValue, status: 'active' });
  }
  if (!biller) {
    throw new Error('BILLER_ERR.NOT_FOUND: Biller was not found.');
  }

  return biller;
}

module.exports = {
  processRequest: async function (service, TRANSBODY) {
    if (service.action !== 'billerTrans') {
      return;
    }

    const biller = await resolveBiller(service, TRANSBODY);
    const params = service.actionParams || {};
    const billCodeField = params.customerCodeField || params.billCodeField || 'BILLCODE';
    const billCode = TRANSBODY[billCodeField] || TRANSBODY.BILLCODE;

    if (!billCode) {
      throw new Error('BILLER_ERR.MISSING_BILL_CODE: Bill code is required.');
    }

    const payload = await postJson(biller.inquiryUrl, {
      billCode,
      serviceCode: service.code,
      transRefId: TRANSBODY.TRANSREFID || null,
    });

    const amount = getNestedValue(payload, ['amount', 'data.amount', 'bill.amount', 'billAmount', 'data.billAmount']);
    if (amount === undefined || Number.isNaN(Number(amount))) {
      throw new Error('BILLER_ERR.INVALID_INQUIRY_AMOUNT: Biller inquiry did not return a valid amount.');
    }

    TRANSBODY.AMOUNT = Number(amount);
    TRANSBODY.BILLERID = biller.id;
    TRANSBODY.BILLCODE = billCode;

    const billerRefId = getNestedValue(payload, ['billerRefId', 'data.billerRefId', 'referenceId', 'data.referenceId']);
    if (billerRefId) {
      TRANSBODY.BILLERREFID = billerRefId;
    }
  },

  processPayment: async function (service, TRANSBODY, transactionId) {
    if (service.action !== 'billerTrans') {
      return { status: 'skipped' };
    }

    const biller = await resolveBiller(service, TRANSBODY);
    const payload = await postJson(biller.paymentUrl, {
      billCode: TRANSBODY.BILLCODE,
      amount: TRANSBODY.AMOUNT,
      transRefId: TRANSBODY.TRANSREFID,
      transactionId,
      billerRefId: TRANSBODY.BILLERREFID || null,
    });

    const billerRefId = getNestedValue(payload, ['billerRefId', 'data.billerRefId', 'referenceId', 'data.referenceId']);
    if (billerRefId) {
      TRANSBODY.BILLERREFID = billerRefId;
    }

    return {
      status: 'done',
      response: payload,
    };
  },
};
