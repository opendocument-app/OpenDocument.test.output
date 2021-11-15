# OpenDocument.test.output

related to [OpenDocument.core](https://github.com/opendocument-app/OpenDocument.core) and [OpenDocument.test](https://github.com/opendocument-app/OpenDocument.test)

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
