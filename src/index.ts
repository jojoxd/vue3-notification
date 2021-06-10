import { Plugin } from 'vue-demi';
import { install } from './plugin';
export { notify } from './notify';
export { NotificationsOptions, NotificationsPluginOptions } from './types';

export default {
  install,
} as Plugin;
