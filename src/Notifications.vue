<template>
  <div
    class="vue-notification-group"
    :style="styles"
  >
    <slot
      name="before"
      :list="list"
      :closeAll="destroyAll"
    />

    <component
      :is="componentName"
      :name="animationName"
      @enter="enter"
      @leave="leave"
      @after-leave="clean"
    >
      <div
        v-for="item in active"
        :key="item.id"
        class="vue-notification-wrapper"
        :style="notifyWrapperStyle(item)"
        :data-id="item.id"
        @mouseenter="pauseTimeout"
        @mouseleave="resumeTimeout"
      >
        <slot
          name="body"
          :class="[classes, item.type]"
          :item="item"
          :close="() => destroy(item)"
        >
          <!-- Default slot template -->
          <div
            :class="notifyClass(item)"
            @click="destroyIfNecessary(item)"
          >
            <div
              v-if="item.title"
              class="notification-title"
              v-html="item.title"
            />
            <div
              class="notification-content"
              v-html="item.text"
            />
          </div>
        </slot>
      </div>
    </component>

    <slot
      name="after"
      :list="list"
      :closeAll="destroyAll"
    />
  </div>
</template>

<script setup lang="ts">
import { Id, listToDirection, NotificationItemWithTimer, Timer } from './util';
import { computed, defineEmit, defineProps, onMounted, PropType, ref, toRefs } from 'vue-demi';
import defaults from './defaults';
import parseNumericValue, { ValueType } from './parser';
import { events } from './events';
import { NotificationsOptions } from './types';

const enum STATE {
  IDLE = 0,
  DESTROYED = 2,
}

type NotificationItemExtended = NotificationItemWithTimer & {
  state: STATE,
}

const props = defineProps({
  group: {
    type: String,
    default: '',
  },

  width: {
    type: [Number, String],
    default: 300,
  },

  reverse: {
    type: Boolean,
    default: false,
  },

  position: {
    type: [String, Array] as PropType<string| string[]>,
    default: defaults.position,
  },

  classes: {
    type: String,
    default: 'vue-notification',
  },

  animationType: {
    type: String as PropType<'css' | 'velocity'>,
    default: 'css',
  },

  animation: {
    type: Object,
    default: defaults.velocityAnimation,
  },

  animationName: {
    type: String,
    default: defaults.cssAnimation,
  },

  speed: {
    type: Number,
    default: 300,
  },
  /* Todo */
  cooldown: {
    type: Number,
    default: 0,
  },

  duration: {
    type: Number,
    default: 3000,
  },

  delay: {
    type: Number,
    default: 0,
  },

  max: {
    type: Number,
    default: Infinity,
  },

  ignoreDuplicates: {
    type: Boolean,
    default: false,
  },

  closeOnClick: {
    type: Boolean,
    default: true,
  },

  pauseOnHover: {
    type: Boolean,
    default: false,
  },
});

const {
  group,
  width,
  reverse,
  position,
  classes,
  animationType,
  animation,
  animationName,
  speed,
  cooldown,
  duration,
  delay,
  max,
  ignoreDuplicates,
  closeOnClick,
  pauseOnHover,
} = toRefs(props);

const emit = defineEmit(['click', 'destroy']);

const list = ref<Array<NotificationItemExtended>>([]);
const velocity = ref(/* TODO */);
const timerControl = ref<Timer | null>(null);

// @TODO: Refs
const actualWidth = computed<ValueType>(() => {
  return parseNumericValue(width.value);
});

const isVA = computed(() => {
  return animationType.value === 'velocity';
});

const componentName = computed(() => {
  return isVA.value ? 'velocity-group' : 'css-group';
});

const styles = computed(() => {
  const { x, y } = listToDirection(position.value);
  const _width = actualWidth.value.value;
  const suffix = actualWidth.value.type;

  const _styles: Record<string, string> = {
    width: _width + suffix,
  };

  if (y) {
    _styles[y] = '0px';
  }

  if (x) {
    if (x === 'center') {
      _styles['left'] = `calc(50% - ${+_width / 2}${suffix})`;
    } else {
      _styles[x] = '0px';
    }
  }

  return _styles;
});

const active = computed(() => {
  return list.value.filter(v => v.state !== STATE.DESTROYED);
});

const botToTop = computed(() => {
  // eslint-disable-next-line no-prototype-builtins
  return styles.value.hasOwnProperty('bottom');
});

onMounted(() => {
  events.on<NotificationsOptions>('add', addItem);
  events.on('close', closeItem);
});

const destroyIfNecessary = (item: NotificationItemExtended) => {
  emit('click', item);
  if (closeOnClick.value) {
    destroy(item);
  }
};

const pauseTimeout = () => {
  if (pauseOnHover.value) {
    timerControl.value?.pause();
  }
};

const resumeTimeout = () => {
  if (pauseOnHover.value) {
    timerControl.value?.resume();
  }
};

const addItem = (event: NotificationsOptions = {}): void => {
  event.group ??= '';
  event.data ??= {};

  if (group.value !== event.group) {
    return;
  }

  if (event.clean || event.clear) {
    destroyAll();
    return;
  }

  const _duration = typeof event.duration === 'number'
    ? event.duration
    : duration.value;

  const _speed = typeof event.speed === 'number'
    ? event.speed
    : speed.value;

  const _ignoreDuplicates = typeof event.ignoreDuplicates === 'boolean'
    ? event.ignoreDuplicates
    : ignoreDuplicates.value;

  const { title, text, type, data, id } = event;

  const item: NotificationItemExtended = {
    id: id || Id(),
    title,
    text,
    type,
    state: STATE.IDLE,
    speed: _speed,
    length: _duration + 2 * _speed,
    data,
  };

  if (_duration >= 0) {
    timerControl.value = new Timer(() => destroy(item), item.length, item);
  }

  const direction = reverse.value
    ? !botToTop.value
    : botToTop.value;

  let indexToDestroy = -1;

  const isDuplicate = active.value.some(i => {
    return i.title === event.title && i.text === event.text;
  });

  const canAdd = _ignoreDuplicates ? !isDuplicate : true;

  if (!canAdd) {
    return;
  }

  if (direction) {
    list.value.push(item);

    if (active.value.length > max.value) {
      indexToDestroy = 0;
    }
  } else {
    list.value.unshift(item);

    if (active.value.length > max.value) {
      indexToDestroy = active.value.length - 1;
    }
  }

  if (indexToDestroy !== -1) {
    destroy(active.value[indexToDestroy]);
  }
};

const closeItem = (id: unknown) => {
  destroyById(id);
};

const notifyClass = (item: NotificationItemExtended): string[] => {
  return [
    'vue-notification-template',
    classes.value,
    item.type ?? '',
  ];
};

const notifyWrapperStyle = (item: NotificationItemExtended) => {
  return isVA.value
    ? null
    : { transition: `all ${item.speed}ms` };
};

const destroy = (item: NotificationItemExtended): void => {
  clearTimeout(item.timer);
  item.state = STATE.DESTROYED;

  if (!isVA.value) {
    clean();
  }

  emit('destroy', item);
};

const destroyById = (id: unknown): void => {
  const item = list.value.find(v => v.id === id);

  if (item) {
    destroy(item);
  }
};

const destroyAll = () => {
  active.value.forEach(destroy);
};

const getAnimation = (index: string, el: Element) => {
  const _animation = animation.value?.[index];

  return typeof _animation === 'function'
    ? _animation.call(this, el)
    : _animation;
};

const enter = (el: Element, complete: () => void): void => {
  if (!isVA.value) {
    return;
  }
  const _animation = getAnimation('enter', el);

  velocity.value?.(el, _animation, {
    duration: speed.value,
    complete,
  });
};

const leave = (el: Element, complete: () => void) => {
  if (!isVA.value) {
    return;
  }
  const _animation = getAnimation('leave', el);

  velocity.value?.(el, _animation, {
    duration: speed.value,
    complete,
  });
};

const clean = () => {
  list.value = list.value.filter(v => v.state !== STATE.DESTROYED);
};
</script>
<style>
.vue-notification-group {
  display: block;
  position: fixed;
  z-index: 5000;
}

.vue-notification-wrapper {
  display: block;
  overflow: hidden;
  width: 100%;
  margin: 0;
  padding: 0;
}

.notification-title {
  font-weight: 600;
}

.vue-notification-template {
  display: block;
  box-sizing: border-box;
  background: white;
  text-align: left;
}

.vue-notification {
  display: block;
  box-sizing: border-box;
  text-align: left;
  font-size: 12px;
  padding: 10px;
  margin: 0 5px 5px;

  color: white;
  background: #44A4FC;
  border-left: 5px solid #187FE7;
}

.vue-notification.warn {
  background: #ffb648;
  border-left-color: #f48a06;
}

.vue-notification.error {
  background: #E54D42;
  border-left-color: #B82E24;
}

.vue-notification.success {
  background: #68CD86;
  border-left-color: #42A85F;
}

.vn-fade-enter-active, .vn-fade-leave-active, .vn-fade-move  {
  transition: all .5s;
}

.vn-fade-enter-from, .vn-fade-leave-to {
  opacity: 0;
}

</style>
