type DateHeaderProps = {
  dateLabel: string
  count: number
}

export function DateHeader({ dateLabel, count }: DateHeaderProps) {
  return (
    <header>
      <h2>{dateLabel}</h2>
      <small>{count} capture{count === 1 ? '' : 's'}</small>
    </header>
  )
}
