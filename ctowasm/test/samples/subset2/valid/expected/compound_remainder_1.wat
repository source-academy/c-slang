(module
	(func $main
		(local $x_0 i32)
		(local.set $x_0 (i32.const 10))
		(local.set $x_0 (i32.rem_s (local.get $x_0) (i32.const 2)))
	)
	(start $main)
)
