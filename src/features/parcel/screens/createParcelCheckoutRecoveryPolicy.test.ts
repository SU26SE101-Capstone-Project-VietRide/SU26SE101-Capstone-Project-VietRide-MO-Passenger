import fs from 'node:fs';
import path from 'node:path';

describe('CreateParcel checkout recovery policy', () => {
  const screenSource = fs.readFileSync(
    path.join(__dirname, 'CreateParcelScreen.tsx'),
    'utf8',
  );

  it('does not let the wizard removal guard block Parcel Detail navigation', () => {
    expect(screenSource).toContain(
      'usePreventRemove(intentLocked && !allowLeaveDespiteRetry',
    );
    expect(screenSource).not.toContain('usePreventRemove(step > 1');
    expect(screenSource).toContain('setAllowLeaveDespiteRetry(true)');
    expect(screenSource).toContain("navigation.replace('ParcelDetail'");
  });

  it('preflights the VNPay native module before creating a parcel', () => {
    const sdkPreflightIndex = screenSource.indexOf(
      'assertVnPaySdkAvailable();',
    );
    const createIndex = screenSource.indexOf(
      'createParcelMutation.mutateAsync(payload)',
    );

    expect(sdkPreflightIndex).toBeGreaterThan(-1);
    expect(createIndex).toBeGreaterThan(sdkPreflightIndex);
  });

  it('opens Parcel Detail before handing control to the VNPay SDK', () => {
    const navigateIndex = screenSource.indexOf(
      'await navigateToCreatedParcel(parcelId, depositResult.paymentRedirectUrl);',
    );
    const openVnPayIndex = screenSource.indexOf('await openVnPayPayment({');

    expect(navigateIndex).toBeGreaterThan(-1);
    expect(openVnPayIndex).toBeGreaterThan(navigateIndex);
  });

  it('keeps the created parcel id for exact deposit retry', () => {
    expect(screenSource).toContain(
      'const parcelId = ambiguousRetry.parcelId;',
    );
    expect(screenSource).toContain(
      'depositPaymentMutation.retryRetainedAsync()',
    );
    expect(screenSource).toContain(
      'intentLocked = isAmbiguousRetryActive(ambiguousRetry)',
    );
    expect(screenSource).not.toContain(
      "parcelId: (error as { parcelId?: string }).parcelId || ''",
    );
  });

  it('only starts deposit payment for a parcel awaiting payment', () => {
    expect(screenSource).toContain(
      "if (parcelResult.status !== 'PENDING_PAYMENT')",
    );
  });

  it('does not classify recipient persistence as a parcel creation failure', () => {
    const createIndex = screenSource.indexOf(
      'parcelResult = await createParcelMutation.mutateAsync(payload);',
    );
    const createCatchIndex = screenSource.indexOf('} catch (error) {', createIndex);
    const recipientSaveIndex = screenSource.indexOf(
      'await useSavedRecipientsStore.getState().saveOrTouchRecipient(',
      createCatchIndex,
    );

    expect(createCatchIndex).toBeGreaterThan(createIndex);
    expect(recipientSaveIndex).toBeGreaterThan(createCatchIndex);
    expect(screenSource).toContain('parcel.recipients.parcelCreatedSaveFailed');
    expect(screenSource).toContain('parcel.recipients.retry');
    expect(screenSource).toContain('isLocalSessionScopeCurrent(recipientScope)');
  });

  it('routes a saved parcel to Detail when payment initialization fails', () => {
    const failureHandlerIndex = screenSource.indexOf(
      'const handleDepositFailure =',
    );
    const navigateIndex = screenSource.indexOf(
      'navigateToCreatedParcel(parcelId);',
      failureHandlerIndex,
    );
    const savedWarningIndex = screenSource.indexOf(
      "t('parcel.create.savedPaymentFailed'",
      failureHandlerIndex,
    );

    expect(failureHandlerIndex).toBeGreaterThan(-1);
    expect(navigateIndex).toBeGreaterThan(failureHandlerIndex);
    expect(savedWarningIndex).toBeGreaterThan(navigateIndex);
  });
});
