(module
	(func $main
		(local $i_0 i32)
		(local $x_0 i32)
		(local.set $i_0 (i32.const 10))
		(local.set $x_0 (i32.const 0))
		(loop $loop_0 (local.set $i_0 (i32.sub (local.get $i_0) (i32.const 1))) (local.set $x_0 (i32.add (local.get $x_0) (i32.const 1))) (br_if $loop_0 (i32.gt_s (local.get $i_0) (i32.const 0))))
	)
	(start $main)
)
