defmodule MyList do
  def sum([]), do: 0
  def sum([head | tail]), do: head + sum(tail)

  def count([]), do: 0
  def count([_head | tail]), do: 1 + count(tail)
end

numbers = [4, 8, 15, 16, 23, 42]
IO.inspect(MyList.sum(numbers), label: "sum")
IO.inspect(MyList.count(numbers), label: "count")
IO.inspect(MyList.sum([]), label: "empty list")
