cart = [
  %{item: "notebook", price: 45.0, qty: 3},
  %{item: "pen", price: 12.5, qty: 4},
  %{item: "backpack", price: 899.0, qty: 1}
]

total =
  cart
  |> Enum.map(fn line -> line.price * line.qty end)
  |> Enum.sum()

biggest = Enum.max_by(cart, fn line -> line.price * line.qty end)

IO.puts("Items: #{length(cart)}")
IO.puts("Total: ₱#{:erlang.float_to_binary(total, decimals: 2)}")
IO.puts("Biggest line: #{biggest.item}")
