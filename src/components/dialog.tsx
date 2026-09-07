import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { Radius, Spacing, elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Diálogos de confirmación propios.
 *
 * `Alert.alert` de React Native es una función vacía en react-native-web: en la
 * PWA no aparece nada y la acción nunca se ejecuta. Como la app se usa sobre
 * todo desde el móvil como web, aquí montamos un diálogo con `Modal`, que sí
 * funciona en las dos plataformas.
 *
 *   const { confirm } = useDialog();
 *   if (await confirm({ title: '…', destructive: true })) borrar();
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Pinta la acción en rojo: borrar, descartar, restaurar encima de tus datos. */
  destructive?: boolean;
}

export interface NotifyOptions {
  title: string;
  message?: string;
  okText?: string;
}

interface Request extends ConfirmOptions {
  cancelable: boolean;
}

interface DialogApi {
  /** Resuelve a `true` si el usuario confirma. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Aviso de una sola acción; resuelve al cerrarlo. */
  notify: (options: NotifyOptions) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog necesita estar dentro de <DialogProvider>');
  return api;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  const [request, setRequest] = useState<Request | null>(null);
  // El `resolve` de la promesa en curso; se limpia siempre al cerrar.
  const pending = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    setRequest(null);
    const resolve = pending.current;
    pending.current = null;
    resolve?.(value);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          pending.current?.(false); // por si quedara uno abierto
          pending.current = resolve;
          setRequest({ ...options, cancelable: true });
        }),
      notify: (options) =>
        new Promise<void>((resolve) => {
          pending.current?.(false);
          pending.current = () => resolve();
          setRequest({
            title: options.title,
            message: options.message,
            confirmText: options.okText ?? 'Entendido',
            cancelable: false,
          });
        }),
    }),
    [],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}

      <Modal
        visible={request != null}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}>
        <Pressable
          onPress={() => (request?.cancelable ? close(false) : null)}
          style={{
            flex: 1,
            backgroundColor: c.scrim,
            alignItems: 'center',
            justifyContent: 'center',
            padding: Spacing.five,
          }}>
          {/* El propio cuadro se come el toque para que no cierre al pulsarlo. */}
          <Pressable
            onPress={() => {}}
            style={[
              {
                width: '100%',
                maxWidth: 360,
                backgroundColor: c.surface,
                borderRadius: Radius.xl,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
                padding: Spacing.five,
                gap: Spacing.two,
              },
              elevation(3, c.shadow),
            ]}>
            <Text variant="title">{request?.title}</Text>

            {request?.message ? (
              <Text variant="body" dim style={{ lineHeight: 21 }}>
                {request.message}
              </Text>
            ) : null}

            <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
              <Button
                title={request?.confirmText ?? 'Aceptar'}
                variant={request?.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
              />
              {request?.cancelable ? (
                <Button
                  title={request.cancelText ?? 'Cancelar'}
                  variant="secondary"
                  onPress={() => close(false)}
                />
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}
