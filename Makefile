# Makefile to maintain fnfnen
#
# Requirements:
#   GNU make 3.81 or later

.DEFAULT_GOAL := all
.PHONY: all lint




all: lint




lint: ,,fnfnen.html,checked

,,%,checked: %
	htmllint -f htmllintrc $<
	touch $@




# __END__
