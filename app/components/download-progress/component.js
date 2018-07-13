import Component from '@ember/component';

import moment from 'moment';

import {
  DisposableMixin,
  ContextBoundTasksMixin,
} from 'ember-lifeline';
import { defineError } from 'ember-exex/error';
import { on } from 'ember-decorators/object/evented';

import speedometer from 'npm:speedometer';

export const STATUS_DOWNLOADING = 'downloading';
export const STATUS_VERIFYING = 'verifying';
export const STATUS_EXTRACTING = 'extracting';

export const DownloadError = defineError({
  name: 'DownloadError',
  message: 'Error downloading {asset}',
});

export default Component.extend(DisposableMixin, ContextBoundTasksMixin, {
  downloader: null,

  status: STATUS_DOWNLOADING,
  asset: null,
  value: 0,
  eta: null,

  speed: null,

  onFinish: null,

  @on('init')
  setupSpeedometer() {
    this.speed = speedometer();
  },

  @on('didInsertElement')
  addListeners() {
    const downloader = this.get('downloader');
    if (downloader) {
      this.registerDisposable(() => {
        downloader.off('error', this, this.onError);
        downloader.off('progress', this, this.onProgress);
        downloader.off('verify', this, this.onVerify);
        downloader.off('extract', this, this.onExtract);
        downloader.off('done', this, this.onDone);
        downloader.off('done', this, this.reset);
        this.speed = null;
      });

      downloader.on('error', this, this.onError);
      downloader.on('progress', this, this.onProgress);
      downloader.on('verify', this, this.onVerify);
      downloader.on('extract', this, this.onExtract);
      downloader.on('done', this, this.onDone);
      downloader.on('done', this, this.reset);
    }

    return this;
  },

  onError() {
    const asset = this.get('asset');
    throw new DownloadError({ params: { asset } });
  },

  onProgress(value) {
    return this.debounceTask('updateProgress', value, 250, true);
  },

  onVerify() {
    return this.reset(STATUS_VERIFYING);
  },

  onExtract() {
    return this.reset(STATUS_EXTRACTING);
  },

  onDone() {
    return this.scheduleTask('actions', () => {
      const onFinish = this.get('onFinish');
      if (onFinish) {
        return onFinish();
      }

      return true;
    });
  },

  reset(status = STATUS_DOWNLOADING) {
    return this.scheduleTask('routerTransitions', () => {
      this.setupSpeedometer();
      this.setProperties({ status, value: 0, eta: null });
    });
  },

  updateProgress(value) {
    const delta = value - this.get('value');
    const speed = this.speed(delta);
    const remaining = 1 - value;
    const seconds = Math.round(remaining / speed);
    const eta = moment().add(seconds, 'second').toDate();
    this.setProperties({ value, eta });
  },
});
