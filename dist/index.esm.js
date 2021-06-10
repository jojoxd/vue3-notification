import { defineComponent, toRefs, ref, computed, onMounted, openBlock, createBlock, unref, renderSlot, resolveDynamicComponent, withCtx, Fragment, renderList, createCommentVNode, createVNode } from 'vue';

const directions = {
    x: ['left', 'center', 'right'],
    y: ['top', 'bottom'],
};
/**
  * Sequential ID generator
  */
const Id = (i => () => i++)(0);
/**
  * Splits space/tab separated string into array and cleans empty string items.
  */
const split = (value) => {
    if (typeof value !== 'string') {
        return [];
    }
    return value.split(/\s+/gi).filter(v => v);
};
/**
  * Cleanes and transforms string of format "x y" into object {x, y}.
  * Possible combinations:
  *   x - left, center, right
  *   y - top, bottom
  */
const listToDirection = (value) => {
    if (typeof value === 'string') {
        value = split(value);
    }
    let x = null;
    let y = null;
    value.forEach(v => {
        if (directions.y.indexOf(v) !== -1) {
            y = v;
        }
        if (directions.x.indexOf(v) !== -1) {
            x = v;
        }
    });
    return { x, y };
};
class Timer {
    constructor(callback, delay, notifItem) {
        this.remaining = delay;
        this.callback = callback;
        this.notifyItem = notifItem;
        this.resume();
    }
    pause() {
        clearTimeout(this.notifyItem.timer);
        this.remaining -= Date.now() - this.start;
    }
    resume() {
        this.start = Date.now();
        clearTimeout(this.notifyItem.timer);
        // @ts-ignore FIXME Node.js timer type
        this.notifyItem.timer = setTimeout(this.callback, this.remaining);
    }
}

var defaults = {
    position: ['top', 'right'],
    cssAnimation: 'vn-fade',
    velocityAnimation: {
        enter: (el) => {
            const height = el.clientHeight;
            return {
                height: [height, 0],
                opacity: [1, 0],
            };
        },
        leave: {
            height: 0,
            opacity: [0, 1],
        },
    },
};

const floatRegexp = '[-+]?[0-9]*.?[0-9]+';
const types = [
    {
        name: 'px',
        regexp: new RegExp(`^${floatRegexp}px$`),
    },
    {
        name: '%',
        regexp: new RegExp(`^${floatRegexp}%$`),
    },
    /**
     * Fallback option
     * If no suffix specified, assigning "px"
     */
    {
        name: 'px',
        regexp: new RegExp(`^${floatRegexp}$`),
    },
];
const getType = (value) => {
    if (value === 'auto') {
        return {
            type: value,
            value: 0,
        };
    }
    for (let i = 0; i < types.length; i++) {
        const type = types[i];
        if (type.regexp.test(value)) {
            return {
                type: type.name,
                value: parseFloat(value),
            };
        }
    }
    return {
        type: '',
        value,
    };
};
const parse = (value) => {
    switch (typeof value) {
        case 'number':
            return { type: 'px', value };
        case 'string':
            return getType(value);
        default:
            return { type: '', value };
    }
};

function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i&&i.push(e)||n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&i.splice(i.indexOf(e)>>>0,1);},emit:function(t,e){(n.get(t)||[]).slice().map(function(n){n(e);}),(n.get("*")||[]).slice().map(function(n){n(t,e);});}}}

const events = mitt();

var script = defineComponent({
    expose: [],
    props: {
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
            type: [String, Array],
            default: defaults.position,
        },
        classes: {
            type: String,
            default: 'vue-notification',
        },
        animationType: {
            type: String,
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
    },
    emits: ['click', 'destroy'],
    setup(__props, { emit }) {
        const props = __props;
        const { group, width, reverse, position, classes, animationType, animation, animationName, speed, cooldown, duration, delay, max, ignoreDuplicates, closeOnClick, pauseOnHover, } = toRefs(props);
        const list = ref([]);
        const velocity = ref( /* TODO */);
        const timerControl = ref(null);
        // @TODO: Refs
        const actualWidth = computed(() => {
            return parse(width.value);
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
            const _styles = {
                width: _width + suffix,
            };
            if (y) {
                _styles[y] = '0px';
            }
            if (x) {
                if (x === 'center') {
                    _styles['left'] = `calc(50% - ${+_width / 2}${suffix})`;
                }
                else {
                    _styles[x] = '0px';
                }
            }
            return _styles;
        });
        const active = computed(() => {
            return list.value.filter(v => v.state !== 2 /* DESTROYED */);
        });
        const botToTop = computed(() => {
            // eslint-disable-next-line no-prototype-builtins
            return styles.value.hasOwnProperty('bottom');
        });
        onMounted(() => {
            events.on('add', addItem);
            events.on('close', closeItem);
        });
        const destroyIfNecessary = (item) => {
            emit('click', item);
            if (closeOnClick.value) {
                destroy(item);
            }
        };
        const pauseTimeout = () => {
            var _a;
            if (pauseOnHover.value) {
                (_a = timerControl.value) === null || _a === void 0 ? void 0 : _a.pause();
            }
        };
        const resumeTimeout = () => {
            var _a;
            if (pauseOnHover.value) {
                (_a = timerControl.value) === null || _a === void 0 ? void 0 : _a.resume();
            }
        };
        const addItem = (event = {}) => {
            var _a, _b;
            (_a = event.group) !== null && _a !== void 0 ? _a : (event.group = '');
            (_b = event.data) !== null && _b !== void 0 ? _b : (event.data = {});
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
            const item = {
                id: id || Id(),
                title,
                text,
                type,
                state: 0 /* IDLE */,
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
            }
            else {
                list.value.unshift(item);
                if (active.value.length > max.value) {
                    indexToDestroy = active.value.length - 1;
                }
            }
            if (indexToDestroy !== -1) {
                destroy(active.value[indexToDestroy]);
            }
        };
        const closeItem = (id) => {
            destroyById(id);
        };
        const notifyClass = (item) => {
            var _a;
            return [
                'vue-notification-template',
                classes.value,
                (_a = item.type) !== null && _a !== void 0 ? _a : '',
            ];
        };
        const notifyWrapperStyle = (item) => {
            return isVA.value
                ? null
                : { transition: `all ${item.speed}ms` };
        };
        const destroy = (item) => {
            clearTimeout(item.timer);
            item.state = 2 /* DESTROYED */;
            if (!isVA.value) {
                clean();
            }
            emit('destroy', item);
        };
        const destroyById = (id) => {
            const item = list.value.find(v => v.id === id);
            if (item) {
                destroy(item);
            }
        };
        const destroyAll = () => {
            active.value.forEach(destroy);
        };
        const getAnimation = (index, el) => {
            var _a;
            const _animation = (_a = animation.value) === null || _a === void 0 ? void 0 : _a[index];
            return typeof _animation === 'function'
                ? _animation.call(this, el)
                : _animation;
        };
        const enter = (el, complete) => {
            var _a;
            if (!isVA.value) {
                return;
            }
            const _animation = getAnimation('enter', el);
            (_a = velocity.value) === null || _a === void 0 ? void 0 : _a.call(velocity, el, _animation, {
                duration: speed.value,
                complete,
            });
        };
        const leave = (el, complete) => {
            var _a;
            if (!isVA.value) {
                return;
            }
            const _animation = getAnimation('leave', el);
            (_a = velocity.value) === null || _a === void 0 ? void 0 : _a.call(velocity, el, _animation, {
                duration: speed.value,
                complete,
            });
        };
        const clean = () => {
            list.value = list.value.filter(v => v.state !== 2 /* DESTROYED */);
        };
        return (_ctx, _cache) => {
            return (openBlock(), createBlock("div", {
                class: "vue-notification-group",
                style: unref(styles)
            }, [
                renderSlot(_ctx.$slots, "before", {
                    list: list.value,
                    closeAll: destroyAll
                }),
                (openBlock(), createBlock(resolveDynamicComponent(unref(componentName)), {
                    name: unref(animationName),
                    onEnter: enter,
                    onLeave: leave,
                    onAfterLeave: clean
                }, {
                    default: withCtx(() => [
                        (openBlock(true), createBlock(Fragment, null, renderList(unref(active), (item) => {
                            return (openBlock(), createBlock("div", {
                                key: item.id,
                                class: "vue-notification-wrapper",
                                style: notifyWrapperStyle(item),
                                "data-id": item.id,
                                onMouseenter: pauseTimeout,
                                onMouseleave: resumeTimeout
                            }, [
                                renderSlot(_ctx.$slots, "body", {
                                    class: [unref(classes), item.type],
                                    item: item,
                                    close: () => destroy(item)
                                }, () => [
                                    createCommentVNode(" Default slot template "),
                                    createVNode("div", {
                                        class: notifyClass(item),
                                        onClick: ($event) => (destroyIfNecessary(item))
                                    }, [
                                        (item.title)
                                            ? (openBlock(), createBlock("div", {
                                                key: 0,
                                                class: "notification-title",
                                                innerHTML: item.title
                                            }, null, 8 /* PROPS */, ["innerHTML"]))
                                            : createCommentVNode("v-if", true),
                                        createVNode("div", {
                                            class: "notification-content",
                                            innerHTML: item.text
                                        }, null, 8 /* PROPS */, ["innerHTML"])
                                    ], 10 /* CLASS, PROPS */, ["onClick"])
                                ])
                            ], 44 /* STYLE, PROPS, HYDRATE_EVENTS */, ["data-id"]));
                        }), 128 /* KEYED_FRAGMENT */))
                    ]),
                    _: 3 /* FORWARDED */
                }, 8 /* PROPS */, ["name"])),
                renderSlot(_ctx.$slots, "after", {
                    list: list.value,
                    closeAll: destroyAll
                })
            ], 4 /* STYLE */));
        };
    }
});

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = "\n.vue-notification-group {\n  display: block;\n  position: fixed;\n  z-index: 5000;\n}\n.vue-notification-wrapper {\n  display: block;\n  overflow: hidden;\n  width: 100%;\n  margin: 0;\n  padding: 0;\n}\n.notification-title {\n  font-weight: 600;\n}\n.vue-notification-template {\n  display: block;\n  box-sizing: border-box;\n  background: white;\n  text-align: left;\n}\n.vue-notification {\n  display: block;\n  box-sizing: border-box;\n  text-align: left;\n  font-size: 12px;\n  padding: 10px;\n  margin: 0 5px 5px;\n\n  color: white;\n  background: #44A4FC;\n  border-left: 5px solid #187FE7;\n}\n.vue-notification.warn {\n  background: #ffb648;\n  border-left-color: #f48a06;\n}\n.vue-notification.error {\n  background: #E54D42;\n  border-left-color: #B82E24;\n}\n.vue-notification.success {\n  background: #68CD86;\n  border-left-color: #42A85F;\n}\n.vn-fade-enter-active, .vn-fade-leave-active, .vn-fade-move  {\n  transition: all .5s;\n}\n.vn-fade-enter-from, .vn-fade-leave-to {\n  opacity: 0;\n}\n\n";
styleInject(css_248z);

script.__file = "src/Notifications.vue";

const params = new Map();

const notify = (args) => {
    if (typeof args === 'string') {
        args = { title: '', text: args };
    }
    if (typeof args === 'object') {
        console.log(args);
        events.emit('add', args);
    }
};
notify.close = function (id) {
    events.emit('close', id);
};

function install(app, args = {}) {
    Object.entries(args).forEach((entry) => params.set(...entry));
    const name = args.name || 'notify';
    app.config.globalProperties['$' + name] = notify;
    app.component(args.componentName || 'notifications', script);
}

var index = {
    install,
};

export default index;
export { notify };
