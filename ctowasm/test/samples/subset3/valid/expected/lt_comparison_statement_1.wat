(module
	(func $main
		(local $x_0 i32)
		(local $y_0 i32)
		(local $z_0 i32)
		(local.set $x_0 (i32.const 2))
		(local.set $y_0 (i32.const 2))
		(local.set $z_0 (i32.lt_s (local.get $x_0) (local.get $y_0)))
	)
	(start $main)
)
