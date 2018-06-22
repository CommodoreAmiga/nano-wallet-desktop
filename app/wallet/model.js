import DS from 'ember-data';
import { A } from '@ember/array';
import { computed } from '@ember/object';

import { attr, hasMany } from 'ember-decorators/data';

import sumAmounts from '../utils/sum-amounts';

const { Model } = DS;

const sumAccountsProperty = dependentKey => computed(`accounts.@each.${dependentKey}`, {
  get() {
    const accounts = this.get('accounts');
    const amounts = A(accounts).mapBy(dependentKey);
    return sumAmounts(amounts);
  },
});

export default Model.extend({
  @hasMany('account', { async: true }) accounts: null,

  @attr seed: null,
  @attr representative: null,

  balance: sumAccountsProperty('balance'),
  pending: sumAccountsProperty('pending'),
});
