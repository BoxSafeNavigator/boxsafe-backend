# Three-step shape audit

Reviewed pinned TripLegBuilder source: begin/end indices refer to the returned trip shape. Strengthened the diagnostic validator to require a shape, bounded indices, full start/end coverage and no missing interior edge records. Twelve synthetic protobuf tests now pass, including malformed/truncated shapes, out-of-range indices and incomplete coverage. These checks are structural, not graph-topology or clearance validation; shape coordinate validity is not certified by the component-count check.

Reran the existing prototype validator: 149 Node tests, five Python endpoint tests and 35 real-engine HTTP cases passed. Native compilation remains blocked and binary verification has not passed. The separate twelve structural tests are synthetic and are not included in those real-engine counts.
