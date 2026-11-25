fizzbuzz = fn n ->
  cond do
    rem(n, 15) == 0 -> "FizzBuzz"
    rem(n, 3) == 0 -> "Fizz"
    rem(n, 5) == 0 -> "Buzz"
    true -> n
  end
end

1..15
|> Enum.map(fizzbuzz)
|> IO.inspect()
