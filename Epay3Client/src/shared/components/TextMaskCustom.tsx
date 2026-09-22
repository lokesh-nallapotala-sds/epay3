import { Ref } from 'react';
import { IMaskInput } from 'react-imask';

interface CustomProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
  mask: string;
  definitions?: Record<string, RegExp>;
  ref?: Ref<HTMLInputElement>;
}

function TextMaskCustom(props: CustomProps) {
  const { onChange, mask, ref, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask={mask}
      definitions={props.definitions}
      inputRef={ref}
      onAccept={(value: string) =>
        onChange({ target: { name: props.name, value } })
      }
      overwrite
    />
  );
}

export default TextMaskCustom;
