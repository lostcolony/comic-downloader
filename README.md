# ComicDownloader

This is a simple utility intended to download free (i.e., no authentication) comics from online sources. With Elixir installed, it should just be a `mix install`, then add your configs, `iex -S mix`, then `ComicDownloader.run`

## Config

Config goes in ./comic_configs; one file per sequential execution. Format is something like (not all keys are necessary)

```
  "comics" => %{
    "WHATEVER_COMIC_NAME" => %{
      "count" => 1,
      "delay" => 1000,
      "extension" => ".gif",
      "img_css" => "CSS SELECTOR TO IMG TAG FOR COMIC",
      "name_func" => &ComicDownloader.Default.url_to_name/1,
      "next_css" => "CSS SELECTOR FOR ANCHOR TAG FOR NEXT URL",
      "url" => "URL_TO_FIRST_COMIC"
    }
  },
  "func" => &ComicDownloader.Default.save_page/1
```
