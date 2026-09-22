import styled from '@emotion/styled';
import {
  Amex,
  Mastercard,
  Visa,
  Discover,
  Diners,
  Jcb,
} from 'react-payment-logos/dist/logo';
import CreditCardIcon from '@mui/icons-material/CreditCard';

const VisaIcon = styled(Visa)(() => ({
  width: 50,
  height: 30,
}));

const MastercardIcon = styled(Mastercard)(() => ({
  width: 50,
  height: 30,
}));

const AmexIcon = styled(Amex)(() => ({
  width: 50,
  height: 30,
}));

const DiscoverIcon = styled(Discover)(() => ({
  width: 50,
  height: 30,
}));

const DinersIcon = styled(Diners)(() => ({
  width: 50,
  height: 30,
}));

const JcbIcon = styled(Jcb)(() => ({
  width: 50,
  height: 30,
}));

export default function PaymentLogo({ icon }: { icon?: string }) {
  const cardImage = () => {
    switch (icon?.toLowerCase()) {
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

  return <div>{cardImage()}</div>;
}
