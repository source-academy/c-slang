(module
	(func $main
		(local $x_0 i32)
		(local.set $x_0 (i32.const 2))
		(local.set $x_0 (i32.sub (local.get $x_0) (i32.const 1)))
	)
	(start $main)
)