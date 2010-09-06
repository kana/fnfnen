# Makefile to maintain fnfnen
#
# Requirements:
#   GNU make 3.81 or later

.DEFAULT_GOAL := all
.PHONY: all lint publish




all: lint




lint: ,,fnfnen.html,checked

,,%,checked: %
	htmllint -f htmllintrc $<
	touch $@




publish:
	[ "$$(git status --porcelain --untracked-files=no)" = '' ]; \
	clean_p=$$?; \
	git stash save; \
	version=$$(git describe --always --dirty --tags); \
	sed -e "s/@@VERSION@[@]/$$version/g" -i \
	  $$(git ls-files | grep -v 'fnfnen.html'); \
	git commit -am "Publish with $$version"; \
	git push . HEAD:gh-pages -f; \
	git reset --hard HEAD~1; \
	if ! [ "$$clean_p" = '0' ]; then \
	  git stash pop; \
	fi




# __END__
