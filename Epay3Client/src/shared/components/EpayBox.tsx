import { Box } from '@mui/system';
import { styled } from '@mui/material/styles';

interface EpayBoxProps {
  height?: string | number;
  boxSizing?: string;
  display?: string;
}

const EpayBox = styled(Box)<EpayBoxProps>`
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  border-width: 0.07rem;
  border-style: solid;
  border-color: #e0e0e0;
  background-color: ${({ theme }) => theme.palette.background.paper};
  color: ${({ theme }) => theme.palette.text.primary};
  ${({ height }) => height && `height: ${height};`}
  ${({ boxSizing }) => boxSizing && `box-sizing: ${boxSizing};`}
  ${({ display }) => display && `display: ${display};`}
`;

export default EpayBox;
