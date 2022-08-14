import { KNode, defineComponent, getCurrentInstance, h, inject, ref, Ref } from 'kdu';

export interface InputProps<T> {
  modelValue?: T;
}

const UPDATE_VALUE_EVENT = 'update:modelValue';
const MODEL_VALUE = 'modelValue';
const ROUTER_LINK_VALUE = 'routerLink';
const NAV_MANAGER = 'navManager';
const ROUTER_PROP_PREFIX = 'router';

/**
 * Starting in Kdu 3.1.0, all properties are
 * added as keys to the props object, even if
 * they are not being used. In order to correctly
 * account for both value props and k-model props,
 * we need to check if the key exists for Kdu <3.1.0
 * and then check if it is not undefined for Kdu >= 3.1.0.
 */
const EMPTY_PROP = Symbol();
const DEFAULT_EMPTY_PROP = { default: EMPTY_PROP };

interface NavManager<T = any> {
  navigate: (options: T) => void;
}

const getComponentClasses = (classes: unknown) => {
  return (classes as string)?.split(' ') || [];
};

const getElementClasses = (ref: Ref<HTMLElement | undefined>, componentClasses: Set<string>, defaultClasses: string[] = []) => {
  return [ ...Array.from(ref.value?.classList || []), ...defaultClasses ]
    .filter((c: string, i, self) => !componentClasses.has(c) && self.indexOf(c) === i);
};

/**
* Create a callback to define a Kdu component wrapper around a Web Component.
*
* @prop name - The component tag name (i.e. `ion-button`)
* @prop componentProps - An array of properties on the
* component. These usually match up with the @Prop definitions
* in each component's TSX file.
* @prop customElement - An option custom element instance to pass
* to customElements.define. Only set if `includeImportCustomElements: true` in your config.
* @prop modelProp - The prop that k-model binds to (i.e. value)
* @prop modelUpdateEvent - The event that is fired from your Web Component when the value changes (i.e. ionChange)
* @prop externalModelUpdateEvent - The external event to fire from your Kdu component when modelUpdateEvent fires. This is used for ensuring that k-model references have been
* correctly updated when a user's event callback fires.
*/
export const defineContainer = <Props, KModelType=string|number|boolean>(
  name: string,
  defineCustomElement: any,
  componentProps: string[] = [],
  modelProp?: string,
  modelUpdateEvent?: string,
  externalModelUpdateEvent?: string
) => {
  /**
  * Create a Kdu component wrapper around a Web Component.
  * Note: The `props` here are not all properties on a component.
  * They refer to whatever properties are set on an instance of a component.
  */

  if (defineCustomElement !== undefined) {
    defineCustomElement();
  }

  const Container = defineComponent<Props & InputProps<KModelType>>((props: any, { attrs, slots, emit }) => {
    let modelPropValue = props[modelProp];
    const containerRef = ref<HTMLElement>();
    const classes = new Set(getComponentClasses(attrs.class));
    const onKnodeBeforeMount = (knode: KNode) => {
      // Add a listener to tell Kdu to update the k-model
      if (knode.el) {
        const eventsNames = Array.isArray(modelUpdateEvent) ? modelUpdateEvent : [modelUpdateEvent];
        eventsNames.forEach((eventName: string) => {
          knode.el!.addEventListener(eventName.toLowerCase(), (e: Event) => {
            modelPropValue = (e?.target as any)[modelProp];
            emit(UPDATE_VALUE_EVENT, modelPropValue);

            /**
             * We need to emit the change event here
             * rather than on the web component to ensure
             * that any k-model bindings have been updated.
             * Otherwise, the developer will listen on the
             * native web component, but the k-model will
             * not have been updated yet.
             */
            if (externalModelUpdateEvent) {
              emit(externalModelUpdateEvent, e);
            }
          });
        });
      }
    };

    const currentInstance = getCurrentInstance();
    const hasRouter = currentInstance?.appContext?.provides[NAV_MANAGER];
    const navManager: NavManager | undefined = hasRouter ? inject(NAV_MANAGER) : undefined;
    const handleRouterLink = (ev: Event) => {
      const { routerLink } = props;
      if (routerLink === EMPTY_PROP) return;

      if (navManager !== undefined) {
        let navigationPayload: any = { event: ev };
        for (const key in props) {
          const value = props[key];
          if (props.hasOwnProperty(key) && key.startsWith(ROUTER_PROP_PREFIX) && value !== EMPTY_PROP) {
            navigationPayload[key] = value;
          }
        }

        navManager.navigate(navigationPayload);
      } else {
        console.warn('Tried to navigate, but no router was found. Make sure you have mounted Kdu Router.');
      }
    }

    return () => {
      modelPropValue = props[modelProp];

      getComponentClasses(attrs.class).forEach(value => {
        classes.add(value);
      });

      const oldClick = props.onClick;
      const handleClick = (ev: Event) => {
        if (oldClick !== undefined) {
          oldClick(ev);
        }
        if (!ev.defaultPrevented) {
          handleRouterLink(ev);
        }
      }

      let propsToAdd: any = {
        ref: containerRef,
        class: getElementClasses(containerRef, classes),
        onClick: handleClick,
        onKnodeBeforeMount: (modelUpdateEvent) ? onKnodeBeforeMount : undefined
      };

      /**
       * We can use Object.entries here
       * to avoid the hasOwnProperty check,
       * but that would require 2 iterations
       * where as this only requires 1.
       */
      for (const key in props) {
        const value = props[key];
        if (props.hasOwnProperty(key) && value !== EMPTY_PROP) {
          propsToAdd[key] = value;
        }
      }

      if (modelProp) {
        /**
         * If form value property was set using k-model
         * then we should use that value.
         * Otherwise, check to see if form value property
         * was set as a static value (i.e. no k-model).
         */
        if (props[MODEL_VALUE] !== EMPTY_PROP) {
          propsToAdd = {
            ...propsToAdd,
            [modelProp]: props[MODEL_VALUE]
          }
        } else if (modelPropValue !== EMPTY_PROP) {
          propsToAdd = {
            ...propsToAdd,
            [modelProp]: modelPropValue
          }
        }
      }

      return h(name, propsToAdd, slots.default && slots.default());
    }
  });

  Container.displayName = name;

  Container.props = {
    [ROUTER_LINK_VALUE]: DEFAULT_EMPTY_PROP
  };

  componentProps.forEach(componentProp => {
    Container.props[componentProp] = DEFAULT_EMPTY_PROP;
  });

  if (modelProp) {
    Container.props[MODEL_VALUE] = DEFAULT_EMPTY_PROP;
    Container.emits = [UPDATE_VALUE_EVENT, externalModelUpdateEvent];
  }

  return Container;
};
