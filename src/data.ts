const v = { // validator
	bool: (name) => (d) => {
		d.addSetting(name, (value) => {
			// d.setValue(name, )
		});
	}
};

class Data {

}


const d = new Data();

d.add(v.bool`logging`);
// settings logging true
// settings emoji
