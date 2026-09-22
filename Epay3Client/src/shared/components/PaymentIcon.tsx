import styled from '@emotion/styled';
import {
  Amex,
  Diners,
  Discover,
  Jcb,
  Mastercard,
  Visa,
} from 'react-payment-logos/dist/flat-rounded';
import CreditCardIcon from '@mui/icons-material/CreditCard';

const VisaIcon = styled(Visa)(() => ({
  width: 50,
  height: 20,
}));

const MastercardIcon = styled(Mastercard)(() => ({
  width: 50,
  height: 20,
}));

const AmexIcon = styled(Amex)(() => ({
  width: 50,
  height: 20,
}));

const DiscoverIcon = styled(Discover)(() => ({
  width: 50,
  height: 20,
}));

const DinersIcon = styled(Diners)(() => ({
  width: 50,
  height: 20,
}));

const JcbIcon = styled(Jcb)(() => ({
  width: 50,
  height: 20,
}));

const IconWrapper = styled('div')(() => ({
  height: '20px',
}));

export default function PaymentIcon({ icon }: { icon: string }) {
  const cardImage = () => {
    switch (icon) {
      case 'visa':
      case 'vi':
        return <VisaIcon />;
      case 'mastercard':
      case 'mc':
      case 'mast':
        return <MastercardIcon />;
      case 'amex':
      case 'ax':
        return <AmexIcon />;
      case 'discover':
      case 'disc':
      case 'di':
        return <DiscoverIcon />;
      case 'diners':
      case 'diners_club':
      case 'diners-club':
      case 'dn':
        return <DinersIcon />;
      case 'jcb':
      case 'jc':
        return <JcbIcon />;
      default:
        return <CreditCardIcon />;
    }
  };

  return <IconWrapper>{cardImage()}</IconWrapper>;
}
