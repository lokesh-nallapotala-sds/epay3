import { Box } from '@mui/system';
import { styled } from '@mui/material/styles';

interface EpayRadioButtonType {
  label?: string;
  id?: string;
  name: string;
  onCheck?: () => void;
  checked?: boolean;
}

const RadioBase = styled('input')(({ theme }) => ({
  accentColor: theme.palette.interactiveColor,
  margin: `0px .25rem 0px 0px`,
}));

export default function EpayRadioButton({
  label,
  id,
  name,
  onCheck,
  checked,
}: EpayRadioButtonType) {
  const handleClick = () => {
    if (onCheck) {
      onCheck();
    }
  };
  return (
    <Box display="flex" alignItems="center">
      <RadioBase
        type="radio"
        name={name}
        id={id}
        checked={checked}
        onClick={handleClick}
      />
      {label}
    </Box>
  );
}
