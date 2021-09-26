# OpenDocument.test.output
related to [OpenDocument.core](https://github.com/opendocument-app/OpenDocument.core) and [OpenDocument.test](https://github.com/opendocument-app/OpenDocument.test)

## Versions
- [OpenDocument.core 19f8594](https://github.com/opendocument-app/OpenDocument.core/tree/19f85948de999bc8f69328ef581f653b401fc9ba)
- [OpenDocument.test 16165cb](https://github.com/opendocument-app/OpenDocument.test/tree/16165cb832a52cb7dbf4c13613dff29e3eb5d6bb)

## HTML config
default + editable

```
struct Config {
  std::uint32_t entryOffset{0};
  std::uint32_t entryCount{0};
  bool splitEntries{false};
  bool editable{true};

  std::uint32_t tableOffsetRows{0};
  std::uint32_t tableOffsetCols{0};
  std::uint32_t tableLimitRows{10000};
  std::uint32_t tableLimitCols{500};
  bool tableLimitByDimensions{true};
  TableGridlines tableGridlines{TableGridlines::SOFT};
};
```

## Formatting
used `format-html.sh` and `format-json.sh` to format outputs
