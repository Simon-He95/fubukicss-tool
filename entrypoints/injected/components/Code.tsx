import { ChevronDownIcon } from '@radix-ui/react-icons'
import { useAtom, useAtomValue } from 'jotai'
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clipboard } from 'react-feather'
import { useCopyToClipboard } from 'usehooks-ts'

import { transformToAtomic } from '@/core'
import {
  cssEngine,
  cssUnit,
  currentSelection,
  expandAtomic,
  expandCode,
  prefixAtom,
} from '@/entrypoints/injected/store'
import { cn } from '@/entrypoints/utils/cn'

export const CodeArea = memo((props: { minimized?: boolean }) => {
  const engine = useAtomValue(cssEngine)
  const unit = useAtomValue(cssUnit)
  const [expand, setExpand] = useAtom(expandCode)
  const [atomicExpand, setAtomicExpand] = useAtom(expandAtomic)
  const prefix = useAtomValue(prefixAtom)
  const isRem = useMemo(() => unit === 'rem', [unit])

  const [name, setName] = useState('')
  const [, setCurrentSelection] = useAtom(currentSelection)
  const [unoResult, setUnoResult] = useState<{ title: string; code: string; type: string }[]>()

  const handleSelectionChange = useCallback(async () => {
    const node = figma?.currentPage?.selection?.[0]
    setCurrentSelection(node ?? null)
    setName((node?.type === 'TEXT' ? node?.characters : node?.name) ?? '')

    const cssObj = await node?.getCSSAsync?.()
    if (cssObj === undefined) return

    const { cssCode, uno, unoMini } = transformToAtomic(cssObj, { engine, isRem, prefix })

    setUnoResult([
      {
        title: engine,
        code: uno,
        type: 'class',
      },
      {
        title: `${engine}-mini`,
        code: unoMini,
        type: 'class',
      },
      {
        title: 'css',
        code: cssCode,
        type: 'css',
      },
      {
        title: 'layout',
        code: `width: ${node?.width}px;\nheight: ${node?.height}px;\ntop: ${node?.y}px;\nleft: ${node?.x}px;\n`,
        type: 'css',
      },
    ])
  }, [engine, isRem, prefix, setCurrentSelection])

  useEffect(() => {
    handleSelectionChange()
  }, [engine, handleSelectionChange])

  useEffect(() => {
    const canvas = document.querySelector('#fullscreen-root canvas')
    canvas?.addEventListener('click', handleSelectionChange)
    return () => {
      canvas?.removeEventListener('click', handleSelectionChange)
    }
  }, [handleSelectionChange])

  useEffect(() => {
    const leftPanel = document.querySelector('#left-panel-container')
    leftPanel?.addEventListener('click', handleSelectionChange)
    return () => {
      leftPanel?.removeEventListener('click', handleSelectionChange)
    }
  }, [handleSelectionChange])

  const [_, copy] = useCopyToClipboard()

  const handleCopy = (text: string) => () => {
    copy(text)
      .then(() => {
        figma?.notify('Copied to clipboard')
      })
      .catch(() => {
        figma?.notify('Failed to copy!', {
          error: true,
        })
      })
  }

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    setTimeout(() => {
      if (!inputRef.current) {
        return
      }
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = inputRef.current.scrollHeight - 32 + 'px'
    }, 0)
  }, [name])

  return (
    <>
      {!name && !props.minimized && <div className="p-4 font-550 text-13px">Select Layer </div>}
      <div className={`relative ${props.minimized || !name ? 'hidden' : ''}`}>
        <div className="flex px-4 py-2 items-center border-b border-$color-border border-solid font-550 text-13px sticky top-45px text-$color-text bg-$color-bg z-2">
          <span className="p-1 hover:bg-#e5e5e5/50 rounded-sm cursor-pointer truncate" onClick={handleCopy(name)}>
            {name}
          </span>
        </div>
        <div
          className="px-4 py-2 text-$color-text bg-$color-bg"
          onMouseMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {unoResult?.map((u, index) => (
            <Fragment key={u.title}>
              {!(index % 2) ? (
                <div
                  className="flex-center cursor-pointer"
                  onClick={() => (index === 0 ? setAtomicExpand(!atomicExpand) : setExpand(!expand))}
                >
                  <span className="text-$color-text-secondary text-11px">{u.type}</span>
                  <ChevronDownIcon
                    className={cn(
                      'block ml-auto text-$color-text-secondary hover:text-$color-text cursor-pointer rotate-180',
                      index === 0 && !atomicExpand ? 'rotate-0' : '',
                      index !== 0 && !expand ? 'rotate-0' : '',
                    )}
                  />
                </div>
              ) : (
                <span
                  className={cn(
                    'block mx-auto h-3',
                    u.type === 'css' && !expand ? '!hidden' : '',
                    u.type === 'class' && !atomicExpand ? '!hidden' : '',
                  )}
                ></span>
              )}
              <div
                className={cn(
                  'flex flex-col items-stretch bg-$color-bg-secondary rounded-sm overflow-hidden',
                  u.type === 'css' && !expand ? '!hidden' : '',
                  u.type === 'class' && !atomicExpand ? '!hidden' : '',
                )}
              >
                <div className="px-4 h-8 flex-center justify-between border-b border-$color-border border-solid">
                  <span className="text-$color-text-secondary text-xs">{u.title}</span>
                  <Clipboard
                    size={16}
                    className="cursor-pointer text-$color-text-secondary hover:text-$color-text"
                    onClick={handleCopy(u.code.replaceAll('<br/>', ''))}
                  />
                </div>
                {u.type !== 'css' ? (
                  <input
                    contentEditable
                    onCut={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    className="px-4 h-10 flex items-center overflow-auto whitespace-nowrap font-['Roboto_Mono'] bg-$color-bg-secondary cursor-text text-$color-text"
                    value={u.code}
                    readOnly
                  ></input>
                ) : (
                  <>
                    <textarea
                      ref={u.title === 'css' ? inputRef : null}
                      rows={4}
                      autoComplete="off"
                      className={cn(
                        "px-4 h-auto py-4 lh-4.5 bg-$color-bg-secondary cursor-text font-['Roboto_Mono'] text-$color-text resize-none scrollbar-hide",
                        u.title === 'layout' ? 'overflow-hidden' : '',
                      )}
                      value={u.code}
                      readOnly
                    ></textarea>
                  </>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </>
  )
})
