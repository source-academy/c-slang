(module
	(func $main
		(local $y_0 i32)
		(local $x_0 i32)
		(local.set $y_0 (i32.const 4))
		(local.set $x_0 (i32.rem_s (i32.const 20) (i32.add (i32.div_s (i32.add (i32.const 4) (i32.const 2)) (i32.const 4)) (i32.mul (i32.const 9) (i32.const 10)))))
	)
	(start $main)
)
