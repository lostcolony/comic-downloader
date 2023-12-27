defmodule ComicDownloader.Webtoons do
  def save_page(data) do
    {next, count} = save_page(Map.get(data, "url"), Map.get(data, "comic_name"), Map.get(data, "count"))

    case next do
      [] -> data
      _ ->
        data
        |> Map.put("url", next)
        |> Map.put("count", count)
    end
  end

  @spec save_page(binary(), binary(), number()) :: {list(), number()}
  def save_page(url, comic_name, count) do
    ComicDownloader.remove_directory(comic_name <> "-temp")
    body = ComicDownloader.get_url(url)
    |> Floki.parse_document!()

    body
    |> Floki.find("#_imageList > img")
    |> Floki.attribute("data-url")
    |> write_pages(comic_name <> "-temp", 1)

    ComicDownloader.combine_images(comic_name <> "-temp", comic_name, count)
    ComicDownloader.remove_directory(comic_name <> "-temp")

    next = body
    |> Floki.find("a._nextEpisode")
    |> Floki.attribute("href")

    {next, count+1}
  end


  def write_pages([], _, _) do
    :ok
  end

  def write_pages([h | t], comic_name, count) do
    ComicDownloader.get_url(h, [{"Referer", "https://www.webtoons.com/"}])
    |> ComicDownloader.write_image(comic_name, count, ".jpg")
    write_pages(t, comic_name, count+1)
  end

  def test() do
    save_page("https://www.webtoons.com/en/comedy/mage-and-demon-queen/episode-1/viewer?title_no=1438&episode_no=1", "mage-and-demon-queen", 1)
  end
end
