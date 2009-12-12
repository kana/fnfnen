# Makefile

all: first
.PHONY: all first


first: ,,fnfnen.html,checked

,,%,checked: %
	htmllint -f htmllintrc $<
	touch $@

# __END__
