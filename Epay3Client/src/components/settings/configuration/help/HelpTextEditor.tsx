import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useFormat } from 'hooks/useFormat';
import './HelpTextEditor.css';

// Text-glyph toolbar buttons (no MUI icon exists for H1/H2) — sized to the same
// 20px box as the fontSize="small" icons so all toolbar buttons match.
const headingButtonSx = {
  width: '20px',
  height: '20px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: 700,
  lineHeight: 1,
};

interface HelpTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

export default function HelpTextEditor({
  value,
  onChange,
  disabled = false,
}: HelpTextEditorProps) {
  const theme = useTheme();
  const f = useFormat();
  const [linkAnchor, setLinkAnchor] = useState<HTMLElement | null>(null);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({
        placeholder: f('configuration.help.text_placeholder'),
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. switching screens) without disturbing the
  // cursor while the admin is actively typing — only resets when they truly differ,
  // which naturally excludes the round-trip caused by this editor's own onUpdate.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const openLinkPopover = (e: React.MouseEvent<HTMLElement>) => {
    setLinkUrl(editor.getAttributes('link').href ?? '');
    setLinkAnchor(e.currentTarget);
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setLinkAnchor(null);
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const activeColor =
    theme.palette.interactiveColor ?? theme.palette.primary.main;

  const activeSx = (active: boolean) => ({
    color: active ? activeColor : 'inherit',
    backgroundColor: active ? alpha(activeColor, 0.1) : 'transparent',
  });

  return (
    <Box
      className="help-text-editor"
      sx={{
        // This app's own neutral field border (MuiTheme.ts's MuiSelect/MuiPaper both use
        // it) — buttonBorder.buttonBorderColor is themed specifically for Button
        // components and can resolve to an arbitrary brand color (e.g. green for this
        // tenant); MUI's own default outline color is also noticeably darker than this.
        border: `1px solid ${theme.mixins.border.color}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        opacity: disabled ? 0.6 : 1,
        '&:focus-within': {
          borderColor: theme.palette.interactiveColor,
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ padding: '4px 6px' }}
      >
        <IconButton
          size="small"
          title={f('configuration.help.text_h1')}
          aria-label={f('configuration.help.text_h1')}
          disabled={disabled}
          sx={activeSx(editor.isActive('heading', { level: 1 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Box component="span" sx={headingButtonSx}>
            H1
          </Box>
        </IconButton>
        <IconButton
          size="small"
          title={f('configuration.help.text_h2')}
          aria-label={f('configuration.help.text_h2')}
          disabled={disabled}
          sx={activeSx(editor.isActive('heading', { level: 2 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Box component="span" sx={headingButtonSx}>
            H2
          </Box>
        </IconButton>
        <IconButton
          size="small"
          title={f('configuration.help.text_bold')}
          aria-label={f('configuration.help.text_bold')}
          disabled={disabled}
          sx={activeSx(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          title={f('configuration.help.text_italic')}
          aria-label={f('configuration.help.text_italic')}
          disabled={disabled}
          sx={activeSx(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          title={f('configuration.help.text_bullet_list')}
          aria-label={f('configuration.help.text_bullet_list')}
          disabled={disabled}
          sx={activeSx(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          title={f('configuration.help.text_numbered_list')}
          aria-label={f('configuration.help.text_numbered_list')}
          disabled={disabled}
          sx={activeSx(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          title={f('configuration.help.text_link')}
          aria-label={f('configuration.help.text_link')}
          disabled={disabled}
          sx={activeSx(editor.isActive('link'))}
          onClick={openLinkPopover}
        >
          <LinkIcon fontSize="small" />
        </IconButton>
        {editor.isActive('link') && (
          <IconButton
            size="small"
            title={f('configuration.help.text_unlink')}
            aria-label={f('configuration.help.text_unlink')}
            disabled={disabled}
            onClick={removeLink}
          >
            <LinkOffIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Divider />
      <EditorContent editor={editor} />
      <Popover
        open={Boolean(linkAnchor)}
        anchorEl={linkAnchor}
        onClose={() => setLinkAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack direction="row" spacing={1} sx={{ padding: '0.75rem' }}>
          <TextField
            size="small"
            autoFocus
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink();
            }}
          />
          <Button variant="contained" size="small" onClick={applyLink}>
            {f('configuration.help.text_link_apply')}
          </Button>
        </Stack>
      </Popover>
    </Box>
  );
}
