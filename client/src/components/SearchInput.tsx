import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { useState, useEffect, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"

interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  debounceMs?: number
  className?: string
}

const SearchInput = memo(function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  onSearch,
  debounceMs = 300,
  className = ""
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value)

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue)
        onSearch?.(internalValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [internalValue, debounceMs])

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleClear = useCallback(() => {
    setInternalValue("")
    onChange("")
    onSearch?.("")
  }, [onChange, onSearch])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(internalValue)
      onSearch?.(internalValue)
    }
  }, [internalValue, onChange, onSearch])

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        onKeyPress={handleKeyPress}
        className="pl-9 pr-9"
        data-testid="input-search"
      />
      {internalValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
          onClick={handleClear}
          data-testid="button-clear-search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
})

export default SearchInput