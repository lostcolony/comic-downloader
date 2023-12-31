defmodule ComicDownloader do
  @moduledoc """
  Documentation for `ComicDownloader`.
  """

  def test() do
    start("./comic_configs/unsounded.exs")
  end

  def test_all() do
    File.ls!("./comic_configs")
    |> Enum.map(fn x -> "./comic_configs/" <> x end)
    |> Enum.map(fn x ->
      IO.inspect(x)
      start(x)
    end)
  end

  def run() do
    File.ls!("./comic_configs")
    |> Enum.map(fn x -> "./comic_configs/" <> x end)
    |> Enum.map(fn x ->
      spawn_link(fn -> start(x) end)
    end)
  end

  @spec start(binary()) :: list()
  def start(file) do
    %{"func" => func, "comics" => comics} = terms = elem(Code.eval_file(file), 0)

    Map.keys(comics)
    |> Enum.reduce(terms, fn key, terms ->
      comics = Map.get(terms, "comics")
      vals = Map.get(comics, key)
      rebuilt_map = Map.put(vals, "comic_name", key)
      loop(file, func, rebuilt_map, terms)
    end)
  end

  def loop(file, func, rebuilt_map, terms) do
    new_map = func.(rebuilt_map)

    case new_map == rebuilt_map do
      true ->
        terms

      false ->
        new_terms = put_in(terms, ["comics", Map.get(rebuilt_map, "comic_name")], new_map)
        # Write update
        File.write!(file, Kernel.inspect(new_terms, [{:pretty, true}]))
        loop(file, func, new_map, new_terms)
    end
  end

  def get_url(url) do
    get_url(url, [])
  end

  def get_url(url, headers) do
    get_url(url, headers, [{:timeout, 10000}, {:recv_timeout, 10000}, follow_redirect: true])
  end

  def get_url(
        url,
        headers,
        request_options
      ) do
    get_url(url, headers, request_options, 3, 3)
  end

  def get_url(url, headers, request_options, retries, max_retries) do
    headers =
      headers ++
        [
          {"User-Agent",
           "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0"}
        ]

    case {HTTPoison.get(url, headers, request_options), retries} do
      {{:ok, resp}, _} ->
        resp.body

      {{:error, error}, 0} ->
        raise(error)

      {{:error, _}, _} ->
        :timer.sleep((max_retries - retries) * 2000)
        get_url(url, headers, request_options, retries - 1, max_retries)
    end
  end

  def write_image(file, comic_name, count, extension) when is_integer(count) do
    path =
      "./downloaded/" <>
        comic_name <> "/" <> to_string(:io_lib.format("~5..0B", [count])) <> extension

    File.mkdir_p!(Path.dirname(path))
    File.write!(path, file)
  end

  def write_image(file, comic_name, name, extension) when is_binary(name) do
    path =
      "./downloaded/" <>
        comic_name <> "/" <> name <> extension

    File.mkdir_p!(Path.dirname(path))
    File.write!(path, file)
  end

  def remove_directory(path) do
    File.rm_rf!("./downloaded/" <> path)
  end

  def combine_images(from, to, count) do
    path =
      "./downloaded/" <>
        to <> "/" <> to_string(:io_lib.format("~5..0B", [count])) <> ".png"

    File.mkdir_p!(Path.dirname(path))

    System.cmd("montage", [
      "-mode",
      "concatenate",
      "-tile",
      "1x",
      "./downloaded/" <> from <> "/*.jpg",
      path
    ])
  end
end
