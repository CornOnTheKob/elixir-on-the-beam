defmodule PingPong do
  def loop do
    receive do
      {:ping, from} ->
        send(from, :pong)
        loop()
    end
  end
end

pong = spawn(&PingPong.loop/0)

for i <- 1..3 do
  send(pong, {:ping, self()})

  receive do
    :pong -> IO.puts("ping #{i} -> pong")
  end
end

IO.inspect(Process.alive?(pong), label: "pong still alive?")
