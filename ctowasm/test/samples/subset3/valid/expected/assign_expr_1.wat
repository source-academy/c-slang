(module
	(func $main
		(local $x_0 i32)
		(local $y_0 i32)
		(local $z_0 i32)
		(local.set $x_0 (i32.const 5))
		(local.set $y_0 (i32.const 10))
		(local.set $z_0 (i32.const 12))
		(local.set $x_0 (local.tee $y_0 (local.tee $z_0 (i32.const 19))))
	)
	(start $main)
)
