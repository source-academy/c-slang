(module
	(func $f
		(param $param_x i32)
		(local $y_0 i32)
	)
	(func $main
		(local $x_0 i32)
		(local.set $x_0 (i32.const 1))
		(call $f (local.get $x_0))
	)
	(start $main)
)
