import { ChangeEvent, useState } from 'react';

import { validatePassword } from 'utilities/utilities';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useFormat } from 'hooks/useFormat';

const PASSWORD_LENGTH_MIN = 8;

export function usePasswordForm() {
  const f = useFormat();

  const changePassword = EpayUserService.useChangePassword();
  const { showToastMessage } = useEpayToast();

  const [currentPasswordText, setCurrentPasswordText] = useState('');
  const [currentPasswordDirty, setCurrentPasswordDirty] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);

  const [newPasswordText, setNewPasswordText] = useState('');
  const [newPasswordDirty, setNewPasswordDirty] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');

  const [confirmPasswordText, setConfirmPasswordText] = useState('');
  const [confirmPasswordDirty, setConfirmPasswordDirty] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const checkPasswords = (
    currentPw: string,
    newPw: string,
    wasNewPwDirty: boolean,
    confirmPw: string,
    wasConfirmPwDirty: boolean,
  ): void => {
    let hasNewPwError = false;
    let hasConfPwError = false;

    if (newPw.length === 0 && wasNewPwDirty) {
      hasNewPwError = true;
      setNewPasswordError(
        f('settings.account.update_password.new_password_required'),
      );
    } else if (newPw.trim().length < PASSWORD_LENGTH_MIN) {
      hasNewPwError = true;
      setNewPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else if (!validatePassword(newPw)) {
      hasNewPwError = true;
      setNewPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else {
      setNewPasswordError('');
    }

    if (confirmPw.trim().length === 0 && wasConfirmPwDirty) {
      hasConfPwError = true;
      setConfirmPasswordError(
        f('settings.account.update_password.confirm_password_required'),
      );
    } else if (confirmPw.trim().length < PASSWORD_LENGTH_MIN) {
      hasConfPwError = true;
      setConfirmPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else if (!validatePassword(confirmPw)) {
      hasConfPwError = true;
      setConfirmPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else {
      setConfirmPasswordError('');
    }

    if (!hasNewPwError && !hasConfPwError) {
      if (newPw !== confirmPw) {
        setNewPasswordError(
          f('settings.account.update_password.new_password_mismatch'),
        );
        setConfirmPasswordError(
          f('settings.account.update_password.new_password_mismatch'),
        );
      } else if (currentPw === newPw) {
        setNewPasswordError(
          f('settings.account.update_password.new_password_must_differ'),
        );
        setConfirmPasswordError(
          f('settings.account.update_password.new_password_must_differ'),
        );
      }
    }
  };

  const handleCurrentPasswordTextChange = (
    e: ChangeEvent<HTMLInputElement>,
  ): void => {
    const s = e.currentTarget.value;
    const wasDirty = currentPasswordDirty;
    setCurrentPasswordText(s);
    setCurrentPasswordDirty(true);
    setCurrentPasswordError(
      s.length === 0 && wasDirty
        ? f('settings.account.update_password.current_password_required')
        : '',
    );
  };

  const handleCurrentPasswordVisibilityChange = (): void => {
    setCurrentPasswordVisible((v) => !v);
  };

  const handleNewPasswordTextChange = (
    e: ChangeEvent<HTMLInputElement>,
  ): void => {
    const s = e.currentTarget.value;
    const wasDirty = newPasswordDirty;
    setNewPasswordText(s);
    setNewPasswordDirty(true);
    checkPasswords(
      currentPasswordText,
      s,
      wasDirty,
      confirmPasswordText,
      confirmPasswordDirty,
    );
  };

  const handleNewPasswordVisibilityChange = (): void => {
    setNewPasswordVisible((v) => !v);
  };

  const handleConfirmPasswordTextChange = (
    e: ChangeEvent<HTMLInputElement>,
  ): void => {
    const s = e.currentTarget.value;
    const wasDirty = confirmPasswordDirty;
    setConfirmPasswordText(s);
    setConfirmPasswordDirty(true);
    checkPasswords(
      currentPasswordText,
      newPasswordText,
      newPasswordDirty,
      s,
      wasDirty,
    );
  };

  const handleConfirmPasswordVisibilityChange = (): void => {
    setConfirmPasswordVisible((v) => !v);
  };

  const allFieldsPopulated = (): boolean =>
    currentPasswordText.length > 0 &&
    newPasswordText.length > 0 &&
    confirmPasswordText.length > 0;

  const isNewPasswordValid = (): boolean =>
    newPasswordText.length >= PASSWORD_LENGTH_MIN &&
    confirmPasswordText.length >= PASSWORD_LENGTH_MIN &&
    newPasswordText === confirmPasswordText;

  const resetInputs = (): void => {
    setCurrentPasswordText('');
    setNewPasswordText('');
    setConfirmPasswordText('');
  };

  const handleSubmit = (): void => {
    changePassword(currentPasswordText, newPasswordText, confirmPasswordText)
      .then((resp) => {
        if (resp.code && resp.code === 200) {
          showToastMessage(
            'success',
            f('settings.account.update_password.success'),
          );
          if (resp.data?.emailError) {
            showToastMessage('warning', resp.data.emailError.message ?? '');
          }
        } else if (resp.code && resp.code === 401) {
          setCurrentPasswordError(
            f('settings.account.update_password.password_incorrect'),
          );
          showToastMessage(
            'error',
            resp?.message ??
              f('settings.account.update_password.password_incorrect'),
          );
        } else if (resp.code && resp.code === 400) {
          setCurrentPasswordError(
            f('settings.account.update_password.password_incorrect'),
          );
          showToastMessage(
            'error',
            resp?.message ??
              f('settings.account.update_password.new_password_mismatch'),
          );
        } else {
          showToastMessage('error', resp?.message ?? f('error.unknown'));
        }
      })
      .catch((err) => {
        if (err && err.code) {
          if (err.code === 401) {
            showToastMessage('error', f('error.user.badcredentials'));
            setCurrentPasswordError(
              f('settings.account.update_password.password_incorrect'),
            );
          } else {
            showToastMessage(
              'error',
              f('error.api')
                .replace('{statusCode}', `${err.code}`)
                .replace('{statusText}', `${err.text}`),
            );
          }
        } else {
          showToastMessage('error', f('error.unknown'));
        }
      })
      .finally(() => {
        resetInputs();
      });
  };

  return {
    currentPasswordText,
    currentPasswordError,
    currentPasswordVisible,
    newPasswordText,
    newPasswordError,
    newPasswordVisible,
    confirmPasswordText,
    confirmPasswordError,
    confirmPasswordVisible,
    allFieldsPopulated,
    isNewPasswordValid,
    handleCurrentPasswordTextChange,
    handleCurrentPasswordVisibilityChange,
    handleNewPasswordTextChange,
    handleNewPasswordVisibilityChange,
    handleConfirmPasswordTextChange,
    handleConfirmPasswordVisibilityChange,
    handleSubmit,
  };
}
