import { useEffect, useRef, useState, ReactNode } from 'react';

import { useIntl } from 'react-intl';

import styled from '@emotion/styled';
import Grid from '@mui/material/Grid';
import { Typography } from '@mui/material';
import { Box, useTheme } from '@mui/system';
import EpayAngleDownIcon from 'shared/icons/EpayAngleDownIcon';

import EpayPopOver from './EpayPopOver';
import EpayCheckBox from './EpayCheckBox';
import { ValidationMessage } from './common/ValidationMessage';

type DropDownItem = { value: Record<string, unknown>; selected: boolean };

interface EpayDropDownProps {
  multi?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  data: Record<string, unknown>[];
  optionKey: string;
  optionText: string;
  value?: unknown;
  onSelect?: (data: unknown) => void;
  optionsLocation?: 'top' | 'bottom' | 'auto';
  height?: string;
  width?: string;
  location?: 'menu' | 'content';
  iserror?: boolean;
  errorMessage?: string;
  renderer?: (data: Record<string, unknown>) => ReactNode;
  label?: string;
}

const BoxBase = styled(Box)((props: any) => ({
  width: props.width ? `calc(${props.width} - 1rem)` : '18rem',
  height: '16px',
  fontFamily: props.theme.typography.fontFamily,
  fontSize: '1rem',
  fontWeight: 500,
  lineHeight: 1.5,
  padding: '.51rem .5rem',
  borderRadius: `${props.theme.shape.borderRadius}px`,
  color:
    props.className === 'content'
      ? props.theme.palette.text.primary
      : props.theme.palette.menu.contrastText,
  backgroundColor:
    props.className === 'content'
      ? props.theme.palette.background.paper
      : props.theme.palette.menu.main,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: props.iserror
    ? `${props.theme.palette.error.main}`
    : props.className === 'content'
      ? `${props.theme.mixins.border.color}`
      : `${props.theme.mixins.border.color}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  '&:hover': {
    borderColor: `${props.theme.palette.text.main}`,
  },
  // match the MUI focus style
  '&:focus-within': {
    borderColor: props.iserror
      ? `${props.theme.palette.error.main}`
      : `${props.theme.palette.primary.borderColor || props.theme.mixins.border.color}`,
    outline: `auto ${props.theme.palette.interactiveColor ? props.theme.palette.interactiveColor : 'rgb(0, 95, 204)'}`,
    outlineOffset: '0px',
  },
}));

const BaseDropDown = styled(Box)((props: any) => ({
  width: props.width ?? '18rem',
  boxShadow:
    'rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px',
  borderRadius: `${props.theme.shape.borderRadius}px`,
  border: `1px solid ${props.theme.mixins.border.color}`,
  backgroundColor:
    props.className === 'content'
      ? props.theme.palette.background.paper
      : props.theme.palette.menu.main,
  paddingTop: '.4rem',
  paddingBottom: '.4rem',
}));

const DropDownOption = styled(Box)((props: any) => ({
  width: 'calc(100% - 1.6rem)',
  padding: '.6rem .8rem',
  fontWeight: 500,
  cursor: 'pointer',
  overflow: 'hidden',
  // textWrap: 'nowrap',
  textOverflow: 'ellipsis',
  backgroundColor:
    props.className === 'selected'
      ? props.theme.palette.highlight.contrastText
      : props.className === 'content'
        ? props.theme.palette.background.paper
        : props.theme.palette.menu.main,
  color:
    props.className === 'selected'
      ? props.theme.palette.text.primary
      : props.className === 'content'
        ? props.theme.palette.text.primary
        : props.theme.palette.menu.contrastText,
  '&:hover': {
    backgroundColor:
      props.className === 'selected'
        ? props.theme.palette.highlight.contrastText
        : 'rgba(0, 0, 0, 0.04)',
  },
}));

const MultiDropDownOption = styled(Box)((props: any) => ({
  width: 'calc(100% - 1.6rem)',
  padding: '.5rem .8rem',
  backgroundColor:
    props.className === 'content'
      ? props.theme.palette.background.paper
      : props.theme.palette.menu.main,
  color:
    props.className === 'content'
      ? props.theme.palette.text.primary
      : props.theme.palette.menu.contrastText,
  cursor: 'pointer',
  display: 'flex',
  alignContent: 'center',
  columnGap: '.5rem',
  minWidth: 0,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));

const EllipsedDiv = styled('div')((props: any) => ({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginLeft: props.sx?.marginLeft || '0px',
}));

export default function EpayDropDown({
  id,
  multi = false,
  data,
  placeholder,
  value,
  optionKey,
  optionText,
  onSelect,
  optionsLocation = 'auto',
  width,
  location = 'content',
  errorMessage,
  iserror,
  renderer,
  label,
}: EpayDropDownProps) {
  const theme = useTheme();
  const intl = useIntl();
  const f = (id: string, values = {}) => intl.formatMessage({ id }, values);

  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState<ReactNode>(placeholder);
  const [iconStyle, setIconStyle] = useState({
    marginRight: '.4rem',
    transform: 'rotate(0deg)',
    color:
      location === 'content'
        ? `rgba(0, 0, 0, 0.5)`
        : theme.palette.menu.contrastText,
  });
  const [dataSet, setDataSet] = useState<DropDownItem[]>([]);
  const [selected, setSelected] = useState<unknown>();

  const componentRef = useRef<HTMLDivElement>(null);

  const isSelected = (
    item: Record<string, unknown>,
    value: unknown,
  ): boolean => {
    if (multi && Array.isArray(value)) {
      return (
        value.length > 0 &&
        value.findIndex((v: unknown) => v === item[optionKey]) >= 0
      );
    }

    if (!multi && !Array.isArray(value)) {
      return !!value && value === item[optionKey];
    }

    return false;
  };

  useEffect(() => {
    if (!value) {
      setDisplay(placeholder);
    }
  }, [placeholder, value]);

  useEffect(() => {
    const arrayData: DropDownItem[] = [];
    data.map((item) =>
      arrayData.push({ value: item, selected: isSelected(item, value) }),
    );

    if (value) {
      const selectedData = arrayData.filter((item) => item.selected === true);
      const numSelected = f('invoices.filters.num_selected', {
        num: selectedData.length,
      });

      if (multi) {
        setDisplay(numSelected);
      } else {
        if (selectedData.length === 1)
          setDisplay(
            renderer
              ? renderer(selectedData[0]['value'])
              : (selectedData[0]['value'][optionText] as ReactNode),
          );
      }
    }

    setDataSet(arrayData);
    setSelected(value);
  }, [data, value]);

  const openSelect = () => {
    const open = !isOpen;
    const style = iconStyle;
    style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    setIsOpen(open);
    setIconStyle(style);

    if (!open && onSelect && multi) {
      const selectedArr = Array.isArray(selected) ? selected : [];
      const valueArr = Array.isArray(value) ? value : [];
      const diff1 = selectedArr.filter((item) => !valueArr.includes(item));
      const diff2 = valueArr.filter((item) => !selectedArr.includes(item));
      if (diff1.length !== 0 || diff2.length !== 0) {
        onSelect(selected);
      }
    }
  };
  const closeSelect = () => {
    setIsOpen(false);
    const style = iconStyle;
    style.transform = 'rotate(0deg)';
    setIconStyle(style);
  };

  const selectSingle = (data: DropDownItem) => {
    const idx = dataSet.findIndex(
      (x) => x.value[optionKey] === data.value[optionKey],
    );
    let selectedValue: unknown = null;
    if (idx >= 0) {
      setDisplay(
        renderer
          ? renderer(dataSet[idx].value)
          : (dataSet[idx].value[optionText] as ReactNode),
      );
      selectedValue = dataSet[idx].value[optionKey];
    }

    setSelected(selectedValue);

    if (onSelect) {
      onSelect(selectedValue);
    }

    openSelect();
  };

  const selectMultiple = (data: DropDownItem) => {
    const updatedData: DropDownItem[] = JSON.parse(JSON.stringify(dataSet));
    const idx = updatedData.findIndex(
      (x) => x.value[optionKey] === data.value[optionKey],
    );
    if (idx >= 0) {
      updatedData[idx].selected = !updatedData[idx].selected;
      const selectedData = updatedData.filter((item) => item.selected === true);

      setDisplay(`${selectedData.length} Selected`);
      setDataSet(updatedData);
      const values = selectedData.map((item) => item.value);
      const selected = values.map((value) => value[optionKey]);
      setSelected(selected);
      if (onSelect) {
        onSelect(selected);
      }
    }
  };

  return (
    <Box>
      <Grid container direction="column" rowGap=".3rem">
        <Grid item>
          {!!label && <Typography variant="fieldHeader">{label}</Typography>}
        </Grid>
        <Grid item>
          <BoxBase
            ref={componentRef}
            tabIndex={0}
            onClick={() => openSelect()}
            width={width}
            className={location}
            iserror={iserror}
            id={id}
          >
            <EllipsedDiv sx={{ marginLeft: '0.375rem' }}>{display}</EllipsedDiv>
            <EpayAngleDownIcon sx={iconStyle} />
          </BoxBase>
          {iserror && errorMessage && (
            <ValidationMessage>{errorMessage}</ValidationMessage>
          )}
          {isOpen && (
            <EpayPopOver
              onClickOutSide={() => closeSelect()}
              componentRef={componentRef}
              childrenLocation={optionsLocation}
            >
              {multi ? (
                <BaseDropDown
                  width={`${componentRef.current?.offsetWidth}px`}
                  className={location}
                >
                  {dataSet.map((d) => {
                    return (
                      <MultiDropDownOption
                        key={d.value[optionKey]}
                        className={location}
                      >
                        <Grid
                          container
                          direction="row"
                          alignItems="center"
                          columnGap=".75rem"
                          wrap="nowrap"
                          sx={{ minWidth: 0 }}
                        >
                          <Grid item>
                            <EpayCheckBox
                              checked={d.selected}
                              onClick={() => selectMultiple(d)}
                            />
                          </Grid>
                          <Grid item xs sx={{ minWidth: 0 }}>
                            <EllipsedDiv>
                              {renderer
                                ? renderer(d.value)
                                : d.value[optionText]}
                            </EllipsedDiv>
                          </Grid>
                        </Grid>
                      </MultiDropDownOption>
                    );
                  })}
                </BaseDropDown>
              ) : (
                <BaseDropDown
                  width={`${componentRef.current?.offsetWidth}px`}
                  className={location}
                >
                  {dataSet.map((d) => {
                    const isSelected = selected === d.value[optionKey];
                    return (
                      <DropDownOption
                        key={d.value[optionKey]}
                        onClick={() => selectSingle(d)}
                        className={isSelected ? 'selected' : location}
                      >
                        {renderer ? renderer(d.value) : d.value[optionText]}
                      </DropDownOption>
                    );
                  })}
                </BaseDropDown>
              )}
            </EpayPopOver>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
