function getInputValue(token, context) {
  if (!token) {
    return undefined;
  }

  if (token === 'USERID') {
    return context.userId;
  }
  if (token === 'CLIENTTYPE') {
    return context.clientType;
  }

  if (token.startsWith('parameters.')) {
    return context.transData[token.replace('parameters.', '')];
  }

  if (token.startsWith('actionParams.')) {
    return context.service.actionParams
      ? context.service.actionParams[token.replace('actionParams.', '')]
      : undefined;
  }

  if (context.TRANSBODY[token] !== undefined) {
    return context.TRANSBODY[token];
  }
  if (context.transData[token] !== undefined) {
    return context.transData[token];
  }

  return token;
}

async function findPocketByUserId(userId) {
  if (!userId) {
    return null;
  }
  return await Pocket.findOne({ user: userId, status: 'active' });
}

async function findPocketByPhone(phone) {
  if (!phone) {
    return null;
  }

  const customer = await Customer.findOne({ phone });
  if (!customer) {
    return null;
  }

  return await Pocket.findOne({ user: customer.id, status: 'active' });
}

async function findPocketByBillerId(value) {
  if (!value) {
    return null;
  }

  let biller = await Biller.findOne({ id: value });
  if (!biller) {
    biller = await Biller.findOne({ code: value });
  }
  if (!biller) {
    return null;
  }

  if (biller.pocket) {
    const pocket = await Pocket.findOne({ id: biller.pocket, status: 'active' });
    if (pocket) {
      return pocket;
    }
  }

  return await Pocket.findOne({ user: biller.id, client: 'biller', status: 'active' });
}

async function findPocketByPocketId(pocketId) {
  if (!pocketId) {
    return null;
  }
  return await Pocket.findOne({ id: pocketId, status: 'active' });
}

const queryRegistry = {
  queryPocketByUserId: findPocketByUserId,
  queryPocketByPhone: findPocketByPhone,
  queryPocketByBillerId: findPocketByBillerId,
  queryPocketByPocketId: findPocketByPocketId,
};

module.exports = {
  listQueries: function () {
    return Object.keys(queryRegistry);
  },

  resolve: async function (fieldBuilder, context) {
    const rule = fieldBuilder.rule || 'mapping';

    if (rule === 'fixed') {
      return fieldBuilder.variable;
    }

    if (rule === 'mapping' || rule === 'none') {
      return getInputValue(fieldBuilder.variable || fieldBuilder.name, context);
    }

    if (rule === 'jwt') {
      const pocket = await findPocketByUserId(context.userId);
      return pocket ? pocket.id : undefined;
    }

    if (rule !== 'query') {
      throw new Error(`SYS_ERR.FIELD_RULE_UNKNOWN: Field rule "${rule}" is not supported.`);
    }

    const queryText = fieldBuilder.query || fieldBuilder.variable || '';
    const match = queryText.match(/^(\w+)\((.*?)\)(?:\.(\w+))?$/);
    if (!match) {
      throw new Error(`SYS_ERR.FIELD_QUERY_INVALID: Query "${queryText}" is not valid.`);
    }

    const queryName = match[1];
    const argToken = match[2];
    const outputField = match[3] || 'id';
    const resolver = queryRegistry[queryName];

    if (!resolver) {
      throw new Error(`SYS_ERR.FIELD_QUERY_UNKNOWN: Query "${queryName}" is not registered.`);
    }

    const argValue = getInputValue(argToken, context);
    const result = await resolver(argValue, context);

    return result ? result[outputField] : undefined;
  },

  buildTransactionFields: async function (service, transData, userId, clientType) {
    const TRANSBODY = {
      SERVICEID: service.id,
      CURRENCY: 'VND',
      USERID: userId,
    };

    const context = { service, transData: transData || {}, userId, clientType, TRANSBODY };
    const fieldBuilder = (service.fieldBuilder || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const field of fieldBuilder) {
      const value = await this.resolve(field, context);
      if (value !== undefined) {
        TRANSBODY[field.name] = value;
      }
    }

    delete TRANSBODY.USERID;
    return TRANSBODY;
  },
};
