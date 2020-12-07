# OpenDocument.test.output
related to [OpenDocument.core](https://github.com/opendocument-app/OpenDocument.core) and [OpenDocument.test](https://github.com/opendocument-app/OpenDocument.test)

## Versions
- [OpenDocument.core 5ecfee0](https://github.com/opendocument-app/OpenDocument.core/tree/5ecfee04b4726a18183c729d6b5edb9a0716631a)
- [OpenDocument.test fb2fbef](https://github.com/opendocument-app/OpenDocument.test/tree/fb2fbef8b65cf0f0786abc51b5e37266cda67a91)

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

