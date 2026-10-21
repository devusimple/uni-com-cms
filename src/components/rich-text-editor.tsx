import {
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'
import Editor, { Separator, Toolbar, createButton } from 'react-simple-wysiwyg'
import { cn } from '@/lib/utils'

const ToolbarBold = createButton(
  'Bold',
  <Bold className="size-4" aria-hidden="true" />,
  'bold',
)
const ToolbarItalic = createButton(
  'Italic',
  <Italic className="size-4" aria-hidden="true" />,
  'italic',
)
const ToolbarUnderline = createButton(
  'Underline',
  <Underline className="size-4" aria-hidden="true" />,
  'underline',
)
const ToolbarBulletList = createButton(
  'Bullet list',
  <List className="size-4" aria-hidden="true" />,
  'insertUnorderedList',
)
const ToolbarNumberedList = createButton(
  'Numbered list',
  <ListOrdered className="size-4" aria-hidden="true" />,
  'insertOrderedList',
)
const ToolbarClearFormatting = createButton(
  'Clear formatting',
  <Eraser className="size-4" aria-hidden="true" />,
  'removeFormat',
)
const ToolbarUndo = createButton(
  'Undo',
  <Undo2 className="size-4" aria-hidden="true" />,
  'undo',
)
const ToolbarRedo = createButton(
  'Redo',
  <Redo2 className="size-4" aria-hidden="true" />,
  'redo',
)

interface RichTextEditorProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  ariaLabel?: string
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Describe the product…',
  maxLength,
  ariaLabel = 'Description',
}: RichTextEditorProps) {
  const overLimit = maxLength !== undefined && value.length > maxLength

  return (
    <div className="product-description-editor space-y-2">
      <Editor
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rich-text-content"
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
      >
        <Toolbar>
          <ToolbarUndo aria-label="Undo" />
          <ToolbarRedo aria-label="Redo" />
          <Separator />
          <ToolbarBold aria-label="Bold" />
          <ToolbarItalic aria-label="Italic" />
          <ToolbarUnderline aria-label="Underline" />
          <Separator />
          <ToolbarBulletList aria-label="Bullet list" />
          <ToolbarNumberedList aria-label="Numbered list" />
          <Separator />
          <ToolbarClearFormatting aria-label="Clear formatting" />
        </Toolbar>
      </Editor>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Formatting counts toward the {maxLength?.toLocaleString() ?? '5,000'}-character
          limit.
        </p>
        {maxLength !== undefined ? (
          <p
            className={cn(
              'shrink-0 text-xs tabular-nums text-muted-foreground',
              overLimit && 'text-destructive',
            )}
          >
            {value.length.toLocaleString()} / {maxLength.toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  )
}
