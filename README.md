# OpenDocument.test.output

related to [OpenDocument.core](https://github.com/opendocument-app/OpenDocument.core) and [OpenDocument.test](https://github.com/opendocument-app/OpenDocument.test)

## Versions

- [OpenDocument.core 56b3a2e](https://github.com/opendocument-app/OpenDocument.core/tree/56b3a2e3d9a0fb6d26689ee57d31d78642162160)
- [OpenDocument.test c22f1a1](https://github.com/opendocument-app/OpenDocument.test/tree/c22f1a1b1d6050f99f0f9c603818fb7b8a96ace7)

## HTML config

```
struct Config {
  bool compact_presentation{false};
  bool compact_spreadsheet{false};
  bool compact_drawing{false};

  std::string text_document_output_file_name{"document.html"};
  std::string presentation_output_file_name{"presentation.html"};
  std::string spreadsheet_output_file_name{"spreadsheet.html"};
  std::string drawing_output_file_name{"drawing.html"};

  std::string slide_output_file_name{"slide{index}.html"};
  std::string sheet_output_file_name{"sheet{index}.html"};
  std::string page_output_file_name{"page{index}.html"};

  bool editable{true};

  bool text_document_margin{false};

  std::optional<TableDimensions> spreadsheet_limit{TableDimensions(4000, 500)};
  bool spreadsheet_limit_by_content{true};
  HtmlTableGridlines spreadsheet_gridlines{HtmlTableGridlines::soft};
};
```
