# ComicDownloader

This is a simple utility intended to download free (i.e., no authentication) comics from online sources. With Elixir installed, it should just be a `mix install`, then add your configs, `iex -S mix`, then `ComicDownloader.run`

## Config

Config goes in ./comic_configs; one file per sequential execution. Format is something like (not all keys are necessary)

```
  "comics" => %{
    "frazz" => %{
      "count" => 1,
      "delay" => 1000,
      "extension" => ".gif",
      "img_css" => "picture.item-comic-image img",
      "name_func" => &ComicDownloader.Default.url_to_name/1,
      "next_css" => "a.fa.btn.btn-outline-secondary.btn-circle.fa-caret-right.sm",
      "url" => "https://www.gocomics.com/frazz/2001/04/02"
    }
  },
  "func" => &ComicDownloader.Default.save_page/1
```
