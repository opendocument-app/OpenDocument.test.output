# OpenDocument.test.output

related to [OpenDocument.core](https://github.com/opendocument-app/OpenDocument.core) and [OpenDocument.test](https://github.com/opendocument-app/OpenDocument.test)

## Versions

- [OpenDocument.core 2c74ceb](https://github.com/opendocument-app/OpenDocument.core/tree/2c74ceb30776781d10840cedd29761f6c3e97a3a)
- [OpenDocument.test 24607be](https://github.com/opendocument-app/OpenDocument.test/tree/24607be4e10e251787b237fff0da6ed29d381847)

## HTML config

```
struct Config {
  bool compact_presentation{false};
  bool compact_drawing{false};

  bool editable{true};

  bool text_document_margin{false};

  std::optional<TableDimensions> spreadsheet_limit{TableDimensions(4000, 500)};
  bool spreadsheet_limit_by_content{true};
  HtmlTableGridlines spreadsheet_gridlines{HtmlTableGridlines::soft};
};
```
