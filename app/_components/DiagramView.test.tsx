import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DiagramView } from './DiagramView'

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }))
vi.mock('./exportDiagram', () => ({ exportDiagram: vi.fn() }))

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mock-svg" />' }),
  },
}))

describe('DiagramView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the textarea and render button', () => {
    render(<DiagramView />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /render/i })).toBeInTheDocument()
  })

  it('textarea is pre-filled with the sample source', () => {
    render(<DiagramView />)
    const textarea = screen.getByRole('textbox')
    expect((textarea as HTMLTextAreaElement).value).toContain('flowchart')
  })

  it('clicking Render updates the committed source', async () => {
    const mermaid = (await import('mermaid')).default
    const user = userEvent.setup()
    render(<DiagramView />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'flowchart LR\n  A --> B')

    const button = screen.getByRole('button', { name: /render/i })
    await user.click(button)

    await waitFor(() =>
      expect(mermaid.render).toHaveBeenCalledWith(
        expect.any(String),
        'flowchart LR\n  A --> B',
      ),
    )
  })
})
