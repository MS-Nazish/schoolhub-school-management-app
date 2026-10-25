import { useState } from 'react';
import { Text } from 'react-native';

import { colors } from '@/components/theme';
import { Button, Card, Input, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import type { User } from '@/data/types';
import { t } from '@/lib/i18n';
import { confirmAction, notify } from '@/lib/utils';

export const MIN_PASSWORD = 6;

/** Signed-in user changes their own password */
export function ChangePasswordCard() {
  const { changePassword } = useStore();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setCurrent(''); setNext(''); setConfirm(''); setError('');
  };

  const save = async () => {
    setError('');
    if (!current || !next) return setError(t('Please fill in all fields'));
    if (next.length < MIN_PASSWORD) return setError(t('Password must be at least 6 characters'));
    if (next !== confirm) return setError(t('New passwords do not match'));
    if (next === current) return setError(t('New password must be different'));
    setBusy(true);
    const err = await changePassword(current, next);
    setBusy(false);
    if (err) return setError(err);
    close();
    notify(t('Password changed'), t('Use your new password next time you log in.'));
  };

  if (!open) {
    return (
      <Card>
        <Text style={[styles.muted, { marginBottom: 10 }]}>{t('Keep your account safe with a password only you know.')}</Text>
        <Button variant="outline" icon="key-outline" title={t('Change password')} onPress={() => setOpen(true)} />
      </Card>
    );
  }
  return (
    <Card>
      <Input label={t('Current password')} value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      <Input label={t('New password')} value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password"
        placeholder={t('At least 6 characters')} />
      <Input label={t('Confirm new password')} value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"
        onSubmitEditing={save} />
      {!!error && <Text style={{ color: colors.danger, fontWeight: '600', marginBottom: 10 }}>{error}</Text>}
      <Button icon="checkmark" title={t('Save new password')} onPress={save} loading={busy} disabled={busy} />
      <Button variant="ghost" title={t('Cancel')} onPress={close} style={{ marginTop: 6 }} />
    </Card>
  );
}

/**
 * Admin helps a teacher or parent who forgot their password. With Firebase the app can't see or
 * set other people's passwords, so it emails them a reset link; offline the admin sets one directly.
 */
export function ResetPasswordCard({ person }: { person: User }) {
  const { cloud, sendPasswordReset, setUserPassword } = useStore();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (cloud) {
    return (
      <Card>
        <Text style={[styles.muted, { marginBottom: 10 }]}>
          {t('{name} will get an email at {email} with a link to choose a new password.', { name: person.name, email: person.email })}
        </Text>
        <Button variant="outline" icon="mail-outline" title={t('Send password reset email')} loading={busy} disabled={busy}
          onPress={() => confirmAction(t('Reset password'), t('Send a reset link to {email}?', { email: person.email }), async () => {
            setBusy(true);
            const err = await sendPasswordReset(person.email);
            setBusy(false);
            if (err) notify(t('Could not send the reset email'), err);
            else notify(t('Email sent'), t('Ask {name} to check their inbox (and spam folder).', { name: person.name }));
          })} />
      </Card>
    );
  }
  return (
    <Card>
      <Input label={t('New password for {name}', { name: person.name })} value={password} onChangeText={setPassword}
        secureTextEntry autoComplete="new-password" placeholder={t('At least 6 characters')} />
      <Button variant="outline" icon="key-outline" title={t('Set password')}
        onPress={() => {
          if (password.length < MIN_PASSWORD) return notify(t('Too short'), t('Password must be at least 6 characters'));
          setUserPassword(person.id, password);
          setPassword('');
          notify(t('Password updated'), t('Tell {name} their new password.', { name: person.name }));
        }} />
    </Card>
  );
}
