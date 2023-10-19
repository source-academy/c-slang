(module
	(memory 1)
	(global $sp (mut i32) (i32.const 65524))
	(global $bp (mut i32) (i32.const 65536))
	(global $hp (mut i32) (i32.const 0))
	(global $r1 (mut i32) (i32.const 0))
	(global $r2 (mut i32) (i32.const 0))
	(func $main
		(i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.const 2))
		(if (i32.eq (i32.load (i32.sub (global.get $bp) (i32.const 4))) (i32.const 1)) (then (i32.store (i32.sub (global.get $bp) (i32.const 8)) (i32.const 1)) (i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.const 1))) (else(if (i32.eq (i32.load (i32.sub (global.get $bp) (i32.const 4))) (i32.const 2)) (then (i32.store (i32.sub (global.get $bp) (i32.const 12)) (i32.const 2)) (i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.const 100))) (else(if (i32.eq (i32.load (i32.sub (global.get $bp) (i32.const 4))) (i32.const 3)) (then (i32.store (i32.sub (global.get $bp) (i32.const 16)) (i32.const 3)) (i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.const 3))) (else(i32.store (i32.sub (global.get $bp) (i32.const 20)) (i32.const 4)) (i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.const 4))))))))
	)
	(start $main)
)
