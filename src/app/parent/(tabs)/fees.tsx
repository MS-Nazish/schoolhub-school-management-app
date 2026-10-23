import { Text, View } from 'react-native';

import { ChildSwitcher, useChild } from '@/components/ChildContext';
import { colors } from '@/components/theme';
import { Badge, Button, Card, EmptyState, Screen, SectionTitle, styles } from '@/components/ui';
import { useStore } from '@/data/store';
import { t } from '@/lib/i18n';
import { confirmAction, formatMonth, money, notify } from '@/lib/utils';

export default function ParentFees() {
  const { data, markFeePaid } = useStore();
  const { child } = useChild();
  if (!child) return <Screen><EmptyState text={t('No children linked to your account')} /></Screen>;

  const fees = data.fees.filter((f) => f.studentId === child.id).sort((a, b) => b.month.localeCompare(a.month));
  const due = fees.filter((f) => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0);

  return (
    <Screen>
      <ChildSwitcher />
      <Card style={{ backgroundColor: due ? colors.dangerSoft : colors.successSoft }}>
        <Text style={[styles.muted, { color: due ? colors.danger : colors.success }]}>{t('Total outstanding')}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: due ? colors.danger : colors.success }}>{money(due)}</Text>
        <Text style={[styles.muted, { marginTop: 4 }]}>{due ? t('Please clear dues before the 10th of the month.') : t('All fees are paid. Thank you!')}</Text>
      </Card>

      <SectionTitle title={t('Fee history')} />
      {fees.length === 0 && <EmptyState icon="wallet-outline" text={t('No fee records')} />}
      {fees.map((f) => (
        <Card key={f.id}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{formatMonth(f.month)} — {t('Tuition fee')}</Text>
              <Text style={styles.muted}>{money(f.amount)}{f.paidOn ? ` · ${t('Paid on')} ${f.paidOn}` : ''}</Text>
            </View>
            {f.status === 'paid' ? (
              <Badge text={t('Paid')} color={colors.success} soft={colors.successSoft} />
            ) : (
              <Button small title={t('Pay now')} icon="card-outline" onPress={() =>
                confirmAction(t('Demo payment'), `${money(f.amount)} · ${formatMonth(f.month)}\n${t('No real money is charged.')}`, () => {
                  markFeePaid(f.id);
                  notify(t('Payment successful'), t('The receipt has been recorded.'));
                })} />
            )}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
